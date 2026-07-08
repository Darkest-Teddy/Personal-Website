/* Guestbook emoji set — 20 classic animated GIF smileys, curated to cover the
   widest range of chat expressions (everyday staples + big reactions + niche).
   Registered on window so the guestbook DC reads them for the picker + inserts. */
(function () {
  var P = "./assets/emojis/";
  var E = [
    { t: "Smile",    f: "smile.gif" },
    { t: "Laugh",    f: "rofl.gif" },
    { t: "Sad",      f: "sad.gif" },
    { t: "Cry",      f: "cray.gif" },
    { t: "Wink",     f: "wink.gif" },
    { t: "Love",     f: "give_heart.gif" },
    { t: "Good",     f: "good.gif" },
    { t: "Kiss",     f: "kiss.gif" },
    { t: "Blush",    f: "blush.gif" },
    { t: "Angry",    f: "ireful2.gif" },
    { t: "Shocked",  f: "shok.gif" },
    { t: "Cool",     f: "dirol.gif" },
    { t: "Tongue",   f: "blum3.gif" },
    { t: "Facepalm", f: "facepalm.gif" },
    { t: "Crazy",    f: "wacko.gif" },
    { t: "Dance",    f: "dance.gif" },
    { t: "Sarcasm",  f: "sarcastic.gif" },
    { t: "Thinking", f: "scratch_ones_head.gif" },
    { t: "Excited",  f: "yahoo.gif" },
    { t: "Bored",    f: "boredom.gif" },
  ].map(function (e) { return { t: e.t, u: P + e.f }; });

  window.GB_EMOJIS = E;
})();
