// The 14 sample guestbook entries from the mockup, used as a read-only fallback when
// Supabase isn't configured (offline preview). The live app fetches these same rows
// from the database (seeded via schema.sql); this keeps the app looking populated even
// before keys are set. Emote paths point at the bundled emote assets.

const E = (file, alt) => `<img src="/assets/guestbook/emojis/${file}" alt="${alt}">`;

export const SEED_ENTRIES = [
  { id: "s1", created_at: "2026-07-02T11:53:38-04:00", name: "me", location: "Toronto, Canada", website: "", html: "Sulfur" },
  { id: "s2", created_at: "2026-06-25T04:30:34+00:00", name: "Graveyard Stuffer", location: "Manchester, UK", website: "graveyardstuffer.nekoweb.org", html: `keep the small web alive ${E("give_heart.gif", "Love")} thank you for making something with actual soul in it. stay safe out there` },
  { id: "s3", created_at: "2026-06-24T22:59:42+09:00", name: "12th", location: "Seoul, South Korea", website: "", html: "your website is <b>so cool</b>, really love it so much" },
  { id: "s4", created_at: "2026-06-24T16:32:31-03:00", name: "Covadonga3", location: "Buenos Aires, Argentina", website: "covadonga3.neocities.org", html: `Hello! I found your page while looking for inspiration for my own site. Very pleasant and exemplary work. Best wishes from South America ${E("yahoo.gif", "Excited")}` },
  { id: "s5", created_at: "2026-06-13T22:36:57+08:00", name: "ikmalsaid", location: "Kuala Lumpur, Malaysia", website: "", html: `Just wanted to thank you for all your work.<br>#ikmalsaid was here ${E("dirol.gif", "Cool")}` },
  { id: "s6", created_at: "2026-06-09T22:31:45+00:00", name: "Anonymous", location: "", website: "", html: `I found this place totally by accident and I'm glad I did! It's so cozy and cool ${E("blush.gif", "Blush")}` },
  { id: "s7", created_at: "2026-06-07T10:25:10-07:00", name: "ghostwitch", location: "Portland, USA", website: "", html: `love your website!! i am looking to build my own and bouncing around for inspiration, and yours is so cool! ${E("give_heart.gif", "Love")}` },
  { id: "s8", created_at: "2026-06-06T07:04:48+02:00", name: "arcane", location: "Berlin, Germany", website: "arcaneblog.duckdns.org", html: `nice web site love the style ${E("smile.gif", "Smile")}${E("good.gif", "Good")}` },
  { id: "s9", created_at: "2026-06-05T09:04:10+07:00", name: "CrudeOilisbad", location: "Jakarta, Indonesia", website: "nichechinesebaby.github.io/Webling", html: `helloo.. i currently making my personal website.. xixi ${E("rofl.gif", "Laugh")} i got some inspiration here. in my country we don't really have the old geocities stuff, so seeing this makes me want to build more. pray for us ${E("dance.gif", "Dance")}` },
  { id: "s10", created_at: "2026-06-04T19:34:45-03:00", name: "luxy", location: "São Paulo, Brazil", website: "", html: `i absolutely <font color="#c000c0"><b>love</b></font> this website, it's such an inspiration for me as a web dev ${E("yahoo.gif", "Excited")}` },
  { id: "s11", created_at: "2026-05-31T21:48:00+02:00", name: "Anon", location: "Prague, Czechia", website: "thomash.xyz", html: "We need more websites like this on the internet, and less of the repetitive corporate garbage." },
  { id: "s12", created_at: "2026-05-22T06:40:37+10:00", name: "Neo", location: "Melbourne, Australia", website: "neotheone.neocities.org", html: `I think you got the most amazing &amp; crispy gfx of the entire neocities, great job ${E("yahoo.gif", "Excited")}${E("good.gif", "Good")}` },
  { id: "s13", created_at: "2026-05-21T14:57:55+00:00", name: "dagamerfiles", location: "", website: "", html: "neato" },
  { id: "s14", created_at: "2026-05-18T01:12:09+00:00", name: "sleepyfox", location: "Dublin, Ireland", website: "", html: `browsing at 1am and this made me smile. going to bed now ${E("boredom.gif", "Bored")}` },
];
