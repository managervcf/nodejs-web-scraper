const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

main();

async function main() {
  const numOfPages = 20;
  const baseUrl =
    'https://www.transfermarkt.com/spieler-statistik/wertvollstespieler/marktwertetop?ajax=yw1&page=';

  // To be filled with scrapped data.
  let data = [];

  // Save results in data variable.
  data = await resolvePromises(numOfPages, baseUrl, scrapPage);

  // Write datato JSON file.
  fs.writeFileSync('DATA.json', JSON.stringify(data));
}

// Constructs url and resolve all promises. Returns one, flat array.
async function resolvePromises(amount, baseUrl, callback) {
  let promises = [];

  for (let i = 1; i <= amount; i++) {
    promises = [...promises, callback(baseUrl, i)];
  }

  let result = await Promise.all(promises);

  return result.flat();
}

async function scrapPage(baseUrl, pageNumber) {
  let subarray = [];
  const response = await axios.get(`${baseUrl}${pageNumber}`);

  if (response.status !== 200) {
    throw new Error('Fetch has failed.');
  }

  const $ = cheerio.load(response.data);

  // Insert player name.
  $(
    '#yw1 > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1) > td.hauptlink > a'
  ).each((i, el) => {
    const name = $(el).text();
    subarray.push({ playerName: name });
  });

  // Insert player number.
  $('#yw1 > table > tbody > tr > td:nth-child(1)').each((i, el) => {
    subarray[i].number = +$(el).text();
  });

  // Insert player id.
  $(
    '#yw1 > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1) > td.hauptlink'
  ).each((i, el) => {
    subarray[i].id = +$(el)
      .children()
      .attr('id');
  });

  // Insert player age.
  $('#yw1 > table > tbody > tr > td:nth-child(3)').each((i, el) => {
    subarray[i].age = +$(el).text();
  });

  // Insert player position.
  $(
    '#yw1 > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(2) > td'
  ).each((i, el) => {
    subarray[i].position = $(el).text();
  });

  // Insert player market value.
  $('#yw1 > table > tbody > tr > td.rechts.hauptlink > b').each((i, el) => {
    let value = $(el).text();
    let multiplier = value.endsWith('m') ? 1000000 : 1;
    value = +value.replace('.00m', '').replace('€', '') * multiplier;
    subarray[i].marketValue = value;
    subarray[i].currency = 'euro';
  });

  // Insert player club.
  $('#yw1 > table > tbody > tr > td:nth-child(5) > a > img').each((i, el) => {
    let item = $(el).attr('alt');
    subarray[i].club = item;
  });

  // Insert player nationality.
  $('#yw1 > table > tbody > tr > td:nth-child(4)').each((i, el) => {
    let nationalities = [];
    $(el)
      .children('img')
      .each((i, el) => nationalities.push($(el).attr('alt')));

    subarray[i].nationalities = nationalities;
  });

  return subarray;
}
