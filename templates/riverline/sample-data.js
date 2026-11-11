/* Fiji history, selected dated events. Summaries are short and factual; check against the museum's reviewed sources before publishing in an app. */
window.RIVERLINE_DATA = {
  title: 'Fiji through time',
  view: [1600, 2030],
  lanes: [
    { id: 'contact', label: 'Contact & trade' },
    { id: 'governance', label: 'Governance' },
    { id: 'society', label: 'Society & faith' },
    { id: 'environment', label: 'Land & environment' }
  ],
  eras: [
    { start: -1000, end: 1643, label: 'Settlement and chiefdoms' },
    { start: 1643, end: 1874, label: 'Visitors, traders and missions' },
    { start: 1874, end: 1970, label: 'Colony' },
    { start: 1970, end: 2026, label: 'Independent Fiji' }
  ],
  events: [
    { date: -1000, when: 'c. 1000 BCE', lane: 'society', weight: 3, title: 'Lapita voyagers settle the islands', summary: 'The first settlers arrive about 3,000 years ago, recognised by their distinctive Lapita pottery.' },
    { date: 1643, lane: 'contact', weight: 1, title: 'Tasman sights north-east Fiji', summary: 'Abel Tasman passes the reefs of the north-east islands, the first recorded European sighting.' },
    { date: 1774, lane: 'contact', weight: 1, title: 'Cook visits Vatoa', summary: 'James Cook lands on Vatoa in the southern Lau group.' },
    { date: 1789, lane: 'contact', weight: 1, title: 'Bligh sails through Fiji', summary: 'After the mutiny on the Bounty, William Bligh crosses the group in an open boat; Bligh Water is named after him.' },
    { date: 1804, lane: 'contact', weight: 2, title: 'Sandalwood trade begins', summary: 'Traders strip the sandalwood of Vanua Levu’s Bua coast within about a decade.' },
    { date: '1835-10', when: 'Oct 1835', lane: 'society', weight: 2, title: 'Methodist missionaries land at Lakeba', summary: 'William Cross and David Cargill begin mission work in Lau.' },
    { date: 1854, lane: 'society', weight: 2, title: 'Cakobau accepts Christianity', summary: 'Ratu Seru Epenisa Cakobau of Bau converts, a turning point for the spread of the church.' },
    { date: '1871-06', when: 'June 1871', lane: 'governance', weight: 2, title: 'Kingdom of Fiji proclaimed', summary: 'Cakobau is proclaimed king of a united government based at Levuka.' },
    { date: '1874-10-10', when: '10 Oct 1874', lane: 'governance', weight: 3, title: 'Deed of Cession', summary: 'Fiji is ceded to Britain and becomes a Crown colony.' },
    { date: 1875, lane: 'society', weight: 2, title: 'Measles epidemic', summary: 'Measles spreads after a chiefly party returns from Sydney, killing about a third of the population.' },
    { date: '1879-05-14', when: '14 May 1879', lane: 'society', weight: 3, title: 'The Leonidas arrives', summary: 'The first indentured labourers from India land, beginning the girmit era.' },
    { date: 1882, lane: 'governance', weight: 2, title: 'Capital moves to Suva', summary: 'The seat of government moves from Levuka to Suva.' },
    { date: 1916, lane: 'society', weight: 2, title: 'Indenture recruitment stops', summary: 'Recruitment of indentured labour from India ends; the system is abolished in 1920.' },
    { date: '1970-10-10', when: '10 Oct 1970', lane: 'governance', weight: 3, title: 'Independence', summary: 'Fiji becomes an independent nation, 96 years to the day after cession.' },
    { date: 1987, lane: 'governance', weight: 2, title: 'Two military coups', summary: 'Coups in May and September remove the elected government.' },
    { date: 1997, lane: 'governance', weight: 1, title: 'New constitution', summary: 'A revised constitution is adopted.' },
    { date: '2000-05', when: 'May 2000', lane: 'governance', weight: 2, title: '2000 coup', summary: 'A civilian-led coup holds members of Parliament hostage.' },
    { date: '2006-12', when: 'Dec 2006', lane: 'governance', weight: 2, title: '2006 military coup', summary: 'The military removes the elected government.' },
    { date: 2013, lane: 'governance', weight: 1, title: 'Constitution of 2013', summary: 'A new constitution is adopted.' },
    { date: 2013.5, when: '2013', lane: 'environment', weight: 1, title: 'Levuka becomes World Heritage', summary: 'The old capital is inscribed on the UNESCO World Heritage List as a historic port town.' },
    { date: '2014-09', when: 'Sept 2014', lane: 'governance', weight: 1, title: 'Return to elections', summary: 'The first general election since 2006 is held.' },
    { date: '2016-02-20', when: '20 Feb 2016', lane: 'environment', weight: 3, title: 'Cyclone Winston', summary: 'The strongest tropical cyclone on record in the Southern Hemisphere strikes Fiji.' },
    { date: '2022-12', when: 'Dec 2022', lane: 'governance', weight: 1, title: 'Change of government', summary: 'After the general election a new coalition government takes office.' }
  ]
};
