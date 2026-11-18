// Demo data for the Agent Center concept. Everything here is fictional.
// Replace with calls to the orchestration layer (AWS API Gateway) when real APIs exist.

window.AGENT = { first: 'Jordan', name: 'Jordan Reyes', initials: 'JR', agency: 'Cascade Valley Insurance', code: '4417' };

window.MEMBERS = [
  {
    id: 'alvarez', name: 'Alvarez household', since: 2014, city: 'Yakima, WA', phone: '(509) 555-0142',
    email: 'maria.alvarez@example.com', contact: 'Maria', paperless: true, easyPay: false,
    alert: { kind: 'lapse', text: 'Personal Auto payment is past due. A cancellation notice was sent Nov 14. Coverage cancels Nov 28 unless the past-due amount is received.' },
    policies: [
      { id: 'HO-2210-4471', name: "Member's Best Package, Home", line: 'Home', term: 'Mar 2026 to Mar 2027', premium: 2140, status: 'Active' },
      { id: 'PA-8834-1190', name: 'Personal Auto, 2 vehicles', line: 'Auto', term: 'Jun 2026 to Dec 2026', premium: 1688, status: 'Pending cancel',
        vehicles: [{ year: 2021, make: 'Subaru', model: 'Outback' }, { year: 2017, make: 'Ford', model: 'F-150' }] },
      { id: 'PEL-5521-0083', name: 'Personal Excess Liability, $1M', line: 'Excess', term: 'Mar 2026 to Mar 2027', premium: 312, status: 'Active' }
    ],
    billing: { pastDue: 281.33, nextBill: 140.67, nextDue: 'Dec 14', plan: 'Monthly, account bill', lastPayment: 'Sep 28' },
    claims: [{ id: 'CL-26-118204', title: 'Vehicle damage, 2021 Subaru Outback', reported: 'Nov 10', adjuster: 'Dana Whitfield', stage: 1,
      stages: ['Reported', 'Adjuster assigned', 'Inspection Nov 20', 'Payment'] }],
    documents: [
      { title: 'Auto cancellation notice', date: 'Nov 14' }, { title: 'Home declarations', date: 'Mar 01' },
      { title: 'Claim photos (6)', date: 'Nov 10' }, { title: 'Driver addition form', date: 'Oct 02', signed: true }
    ],
    activity: [
      { date: 'Nov 14', text: 'Cancellation notice sent for Personal Auto (non payment)' },
      { date: 'Nov 12', text: 'Adjuster assigned to vehicle damage claim' },
      { date: 'Nov 10', text: 'Claim reported by agent, photos uploaded' },
      { date: 'Oct 02', text: 'Endorsement processed: added driver to Personal Auto' }
    ],
    starters: ['Home has no Service Line coverage', 'Watercraft listed on excess but not insured with MOE']
  },
  {
    id: 'nguyen', name: 'Nguyen, Thanh', since: 2026, city: 'Boise, ID', phone: '(208) 555-0177', email: 'thanh.nguyen@example.com',
    contact: 'Thanh', paperless: false, easyPay: true,
    alert: { kind: 'info', text: 'Homeowners application is waiting on the member\u2019s e-signature (sent 6 days ago).' },
    policies: [{ id: 'Q-HO-77120', name: 'Homeowners (quote, pending signature)', line: 'Home', term: 'Starts Dec 1, 2026', premium: 1475, status: 'Pending signature' }],
    billing: { pastDue: 0, nextBill: 122.92, nextDue: 'Dec 1', plan: 'Monthly, Easy Pay', lastPayment: 'None yet' },
    claims: [], documents: [{ title: 'Homeowners application', date: 'Nov 12' }],
    activity: [{ date: 'Nov 12', text: 'E-signature request sent from MOEQuote' }], starters: ['No auto policy with MOE']
  },
  {
    id: 'patel', name: 'Patel, Rohan and Anika', since: 2019, city: 'Bend, OR', phone: '(541) 555-0109', email: 'rpatel@example.com',
    contact: 'Rohan', paperless: true, easyPay: true, alert: null,
    policies: [{ id: 'PA-6012-3381', name: 'Personal Auto, 3 vehicles', line: 'Auto', term: 'Feb 2026 to Feb 2027', premium: 2410, status: 'Active',
      vehicles: [{ year: 2022, make: 'Honda', model: 'Pilot' }, { year: 2019, make: 'Toyota', model: 'Camry' }, { year: 2023, make: 'Tesla', model: 'Model 3' }] }],
    billing: { pastDue: 0, nextBill: 200.83, nextDue: 'Dec 5', plan: 'Monthly, Easy Pay', lastPayment: 'Nov 5' },
    claims: [], documents: [{ title: 'Auto declarations', date: 'Feb 01' }],
    activity: [{ date: 'Nov 15', text: "Member's Best package quote started (home and auto)" }],
    starters: ["Quote for Member's Best package expires in 3 days"]
  },
  {
    id: 'cedar-ridge', name: 'Cedar Ridge Orchards', since: 2011, city: 'Wenatchee, WA', phone: '(509) 555-0188', email: 'office@cedarridge.example',
    contact: 'Ellen', paperless: true, easyPay: false, commercial: true,
    alert: { kind: 'info', text: 'Underwriting requested the vineyard questionnaire for the new farm submission.' },
    policies: [{ id: 'FO-1180-2290', name: 'Farmowners, orchard operations', line: 'Farm', term: 'Apr 2026 to Apr 2027', premium: 9840, status: 'Active' }],
    billing: { pastDue: 0, nextBill: 820, nextDue: 'Dec 10', plan: 'Monthly, account bill', lastPayment: 'Nov 10' },
    claims: [], documents: [{ title: 'Farm declarations', date: 'Apr 01' }],
    activity: [{ date: 'Nov 13', text: 'Underwriting requested more information on farm new business' }], starters: ['No commercial auto with MOE']
  },
  {
    id: 'okafor', name: 'Okafor, Chidi', since: 2021, city: 'Missoula, MT', phone: '(406) 555-0121', email: 'chidi.okafor@example.com',
    contact: 'Chidi', paperless: true, easyPay: true, alert: null,
    policies: [
      { id: 'HO-3391-0055', name: 'Traditional Homeowners', line: 'Home', term: 'Jul 2026 to Jul 2027', premium: 1320, status: 'Active' },
      { id: 'BT-0042-7781', name: 'Boatowner, 18 ft runabout', line: 'Boat', term: 'May 2026 to May 2027', premium: 295, status: 'Active' }
    ],
    billing: { pastDue: 0, nextBill: 134.58, nextDue: 'Dec 7', plan: 'Monthly, Easy Pay', lastPayment: 'Nov 7' },
    claims: [{ id: 'CL-26-097731', title: 'Hail damage to roof', reported: 'Aug 22', adjuster: 'Marcus Lee', stage: 3,
      stages: ['Reported', 'Adjuster assigned', 'Inspection', 'Paid Oct 3'] }],
    documents: [{ title: 'Claim payment letter', date: 'Oct 03' }],
    activity: [{ date: 'Oct 03', text: 'Hail claim paid and closed' }], starters: ['No auto policy with MOE']
  }
];

window.QUEUE = [
  { id: 'q1', cat: 'Billing', label: 'Lapse risk', tone: 'red', title: 'Payment past due, cancellation notice sent', member: 'alvarez', detail: 'Personal Auto, cancels Nov 28', action: 'paylink' },
  { id: 'q2', cat: 'Signatures', label: 'Signature', tone: 'orange', title: 'E-signature pending for 6 days', member: 'nguyen', detail: 'Homeowners application from MOEQuote', action: 'resend' },
  { id: 'q3', cat: 'Submissions', label: 'Submission', tone: 'blue', title: 'Underwriting needs more information', member: 'cedar-ridge', detail: 'Farm new business, vineyard questionnaire requested', action: 'submission' },
  { id: 'q4', cat: 'Quotes', label: 'Quote', tone: 'green', title: 'Quote expires in 3 days', member: 'patel', detail: "Member's Best package, home and auto", action: 'quote' },
  { id: 'q5', cat: 'Claims', label: 'Claim', tone: 'plum', title: 'Adjuster assigned and inspection scheduled', member: 'alvarez', detail: 'Vehicle damage claim', action: 'claim' },
  { id: 'q6', cat: 'Billing', label: 'Billing', tone: 'red', title: 'Easy Pay draft returned', member: 'okafor', detail: 'Homeowners, bank account closed', action: 'member' },
  { id: 'q7', cat: 'Quotes', label: 'Quote', tone: 'green', title: 'Renewal premium up 14 percent', member: 'okafor', detail: 'Traditional Homeowners renews Jul 2027', action: 'member' }
];

window.SUBMISSIONS = [
  { name: 'Cedar Ridge Orchards', line: 'Farm new business', status: 'Needs info', tone: 'red', next: 'vineyard questionnaire requested' },
  { name: 'Two Rivers Brewing', line: 'Commercial new business', status: 'In review', tone: 'blue', next: 'expected by Nov 21' },
  { name: 'Valley Grain Co.', line: 'Farm endorsement', status: 'Quoted', tone: 'green', next: 'quote ready to review' }
];

// SAMPLE appetite rules for the demo only. They are NOT MOE underwriting guidance.
// Replace with rules maintained by underwriting from the Commercial and Farm and Ranch appetite guides.
window.APPETITE_SAMPLE = [
  { keys: ['winery', 'vineyard', 'tasting'], cls: 'Winery with tasting room', line: 'Commercial', guide: 'Winery and Vineyard Agent Guide',
    forms: ['Winery Questionnaire - CML316 0726', 'MoE Liquor Liability Supplemental Questionnaire (CML 300 0824)'] },
  { keys: ['brew', 'brewery', 'taproom'], cls: 'Craft brewery', line: 'Commercial', guide: 'Commercial Appetite Guide',
    forms: ['MoE Liquor Liability Supplemental Questionnaire (CML 300 0824)', 'Electrical System Questionnaire - CML301 0420'] },
  { keys: ['restaurant', 'cafe', 'diner'], cls: 'Restaurant', line: 'Commercial', guide: 'Commercial Appetite Guide',
    forms: ['Supplemental Restaurant Questionnaire - CML303 1119'] },
  { keys: ['hotel', 'motel', 'inn'], cls: 'Hotel or motel', line: 'Commercial', guide: 'Commercial Appetite Guide',
    forms: ['Hotel/Motel Questionnaire - CML304 1119'] },
  { keys: ['apartment', 'habitational', 'rental units'], cls: 'Habitational', line: 'Commercial', guide: 'Commercial Appetite Guide',
    forms: ['Habitational Supplemental Questionnaire - CML306 0521', 'Older Building Questionnaire - CML311 0820'] },
  { keys: ['orchard', 'fruit'], cls: 'Orchard operations', line: 'Farm', guide: 'Farm and Ranch Appetite Guide',
    forms: ['Farmowner Orchard Vineyard and Winery Supplemental Questionnaire - FO306 1119'] },
  { keys: ['hay'], cls: 'Hay operations', line: 'Farm', guide: 'Farm and Ranch Appetite Guide', forms: ['Farm Hay Supplemental Questionnaire - FO301 1119'] },
  { keys: ['horse', 'equine', 'stable'], cls: 'Equine', line: 'Farm', guide: 'Farm and Ranch Appetite Guide', forms: ['Farm Equine Supplemental Questionnaire FO309 0421'] },
  { keys: ['agritourism', 'pumpkin', 'corn maze', 'u-pick'], cls: 'Agritourism', line: 'Farm', guide: 'Farm and Ranch Appetite Guide',
    forms: ['Farmowner Agritourism Supplemental Questionnaire - FO305 1119'] },
  { keys: ['convenience', 'gas station', 'c-store'], cls: 'Convenience store', line: 'Commercial', guide: 'Commercial Appetite Guide',
    forms: ['Convenience Store Questionnaire - CML314 0121'] }
];

window.VIN_SAMPLE = {
  'JTMB6RFV5RD000000': '2024 Toyota RAV4 XLE Hybrid',
  '1HGCV1F30LA000000': '2020 Honda Accord Sport',
  '5YJ3E1EA7PF000000': '2023 Tesla Model 3'
};

window.NEWS = [
  { date: 'Oct 12, 2026', tags: 'Personal and commercial, WA', title: 'Wildfire moratorium lifted: Hatch Grade Fire' },
  { date: 'Personal lines', tags: '', title: 'Inland Marine now available in MOEQuote' },
  { date: 'Personal lines, WA', tags: '', title: 'Enhanced Advanced Quote Discount now in Washington' }
];
