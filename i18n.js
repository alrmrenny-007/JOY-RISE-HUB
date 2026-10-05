// i18n.js — lightweight multi-language support for Joy-Rise Hub.
//
// How it works
//  - Markup:  <span data-i18n="share.button">Share Card</span>  (the English
//    text inside is the fallback if a key/language is missing).
//    Also supported: data-i18n-placeholder, data-i18n-aria-label.
//  - Script:  JoyRiseI18n.t('key', { name: 'Ada' })  with {name} placeholders.
//  - The bottom nav (Home / Tickets / Wallet / Help / Deposit) is translated
//    automatically on every page by matching its English label, so no
//    per-page markup is needed there.
//  - Language is saved in localStorage ("joyrise_lang"). Default: browser
//    language if supported, else English.
//
// NOTE: Pidgin/Hausa/Yoruba/Igbo strings below are a first draft. Have a
// native speaker review them before launch — tone matters for a money app.
(function (window) {
  'use strict';

  const LANGS = {
    en: 'English',
    pcm: 'Naijá Pidgin',
    ha: 'Hausa',
    yo: 'Yorùbá',
    ig: 'Igbo',
    fr: 'Français',
  };

  const DICT = {
    en: {
      'nav.home': 'Home', 'nav.tickets': 'Tickets', 'nav.wallet': 'Wallet',
      'nav.help': 'Help', 'nav.deposit': 'Deposit',
      'share.codeLabel': 'Sign up with my code',
      'share.title': 'Share Card',
      'share.button': 'Share Card',
      'share.hint': 'A branded image with your code — perfect for WhatsApp Status and Instagram.',
      'share.use': 'Use my code {code} when you sign up',
      'share.headline': 'Win real cash daily',
      'share.cta': 'Join Joy-Rise Hub',
      'share.generating': 'Making your card…',
      'share.saved': 'Card saved to your device!',
      'share.failed': "Couldn't create the card. Please try again.",
      'proof.biggest': 'Biggest win this week',
      'proof.none': 'No winners yet this week — your turn could be next!',
      'proof.winners': '{n} winners this week',
      'proof.see': 'See all winners',
      'prefs.title': 'Notification Preferences',
      'prefs.push': 'Push',
      'prefs.inapp': 'In-app',
      'prefs.wins': 'Wins & prizes',
      'prefs.payments': 'Deposits & withdrawals',
      'prefs.referrals': 'Referral earnings',
      'prefs.draws': 'Draw reminders',
      'prefs.promos': 'Offers & bonuses',
      'prefs.saved': 'Preferences saved',
      'prefs.pushOff': 'Push is off on this device. Turn it on to receive push alerts.',
      'prefs.enable': 'Enable push',
      'lang.title': 'Language',
      'autobuy.title': 'Auto-Buy',
      'autobuy.save': 'Save Auto-Buy',
      'autobuy.cancel': 'Turn Off Auto-Buy',
      'autobuy.saved': 'Auto-Buy saved',
      'autobuy.off': 'Auto-Buy turned off',
    },
    pcm: {
      'nav.home': 'Home', 'nav.tickets': 'Tikit', 'nav.wallet': 'Wallet',
      'nav.help': 'Help', 'nav.deposit': 'Put Money',
      'share.codeLabel': 'Use my code sign up',
      'share.title': 'Share Kaadi', 'share.button': 'Share Kaadi',
      'share.hint': 'Fine picture wey get your code — e dey sweet for WhatsApp Status and Instagram.',
      'share.use': 'Use my code {code} when you dey sign up',
      'share.headline': 'Win real cash every day', 'share.cta': 'Join Joy-Rise Hub',
      'share.generating': 'Dey make your kaadi…', 'share.saved': 'Kaadi don save for your phone!',
      'share.failed': 'We no fit make the kaadi. Try again.',
      'proof.biggest': 'Biggest win this week', 'proof.none': 'Nobody don win this week yet — na your turn fit be next!',
      'proof.winners': '{n} people win this week', 'proof.see': 'See all winners',
      'prefs.title': 'Notification Settings', 'prefs.push': 'Push', 'prefs.inapp': 'Inside app',
      'prefs.wins': 'Wins & prizes', 'prefs.payments': 'Deposit & withdrawal', 'prefs.referrals': 'Referral money',
      'prefs.draws': 'Draw reminder', 'prefs.promos': 'Offers & bonus',
      'prefs.saved': 'Settings don save', 'prefs.pushOff': 'Push no dey on for this phone. Turn am on make alerts fit enter.',
      'prefs.enable': 'Turn on push',
      'lang.title': 'Language',
      'autobuy.title': 'Auto-Buy', 'autobuy.save': 'Save Auto-Buy', 'autobuy.cancel': 'Turn Off Auto-Buy',
      'autobuy.saved': 'Auto-Buy don save', 'autobuy.off': 'Auto-Buy don off',
    },
    ha: {
      'nav.home': 'Gida', 'nav.tickets': 'Tikiti', 'nav.wallet': 'Walat',
      'nav.help': 'Taimako', 'nav.deposit': 'Saka Kuɗi',
      'share.codeLabel': 'Yi rajista da lambata',
      'share.title': 'Katin Rabawa', 'share.button': 'Raba Kati',
      'share.hint': 'Hoto mai lambar ka — ya dace da WhatsApp Status da Instagram.',
      'share.use': 'Yi amfani da lambata {code} lokacin rajista',
      'share.headline': 'Ci kuɗi na gaske kullum', 'share.cta': 'Shiga Joy-Rise Hub',
      'share.generating': 'Ana yin katin ka…', 'share.saved': 'An ajiye katin a na’urarka!',
      'share.failed': 'Ba a iya yin katin ba. Sake gwadawa.',
      'proof.biggest': 'Mafi girman nasara a wannan mako', 'proof.none': 'Babu wanda ya ci a wannan mako — na gaba zai iya zama kai!',
      'proof.winners': 'Masu nasara {n} a wannan mako', 'proof.see': 'Duba duk masu nasara',
      'prefs.title': 'Saitunan Sanarwa', 'prefs.push': 'Push', 'prefs.inapp': 'A cikin app',
      'prefs.wins': 'Nasara da kyauta', 'prefs.payments': 'Saka kuɗi da cirewa', 'prefs.referrals': 'Kuɗin gayyata',
      'prefs.draws': 'Tunatarwar zane', 'prefs.promos': 'Tayi da kari',
      'prefs.saved': 'An ajiye saitunan', 'prefs.pushOff': 'Push a kashe yake a wannan na’ura. Kunna shi don karɓar sanarwa.',
      'prefs.enable': 'Kunna push',
      'lang.title': 'Harshe',
      'autobuy.title': 'Sayen Kai-tsaye', 'autobuy.save': 'Ajiye', 'autobuy.cancel': 'Kashe Sayen Kai-tsaye',
      'autobuy.saved': 'An ajiye', 'autobuy.off': 'An kashe',
    },
    yo: {
      'nav.home': 'Ilé', 'nav.tickets': 'Tíkẹ́ẹ̀tì', 'nav.wallet': 'Àpamọ́wọ́',
      'nav.help': 'Ìrànlọ́wọ́', 'nav.deposit': 'Fi Owó Sí',
      'share.codeLabel': 'Forúkọ sílẹ̀ pẹ̀lú kóòdù mi',
      'share.title': 'Káàdì Ìpín', 'share.button': 'Pín Káàdì',
      'share.hint': 'Àwòrán tó ní kóòdù rẹ — ó dára fún WhatsApp Status àti Instagram.',
      'share.use': 'Lo kóòdù mi {code} nígbà tí o bá ń forúkọ sílẹ̀',
      'share.headline': 'Jèrè owó gidi lójoojúmọ́', 'share.cta': 'Darapọ̀ mọ́ Joy-Rise Hub',
      'share.generating': 'À ń ṣe káàdì rẹ…', 'share.saved': 'A ti fi káàdì pamọ́!',
      'share.failed': 'Kò ṣeé ṣe láti ṣe káàdì. Gbìyànjú lẹ́ẹ̀kan sí i.',
      'proof.biggest': 'Ìṣẹ́gun tó tóbi jù ní ọ̀sẹ̀ yìí', 'proof.none': 'Kò sí ẹni tó ṣẹ́gun ní ọ̀sẹ̀ yìí — o lè jẹ́ tìrẹ tókàn!',
      'proof.winners': 'Àwọn olùṣẹ́gun {n} ní ọ̀sẹ̀ yìí', 'proof.see': 'Wo gbogbo olùṣẹ́gun',
      'prefs.title': 'Ètò Ìfitónilétí', 'prefs.push': 'Push', 'prefs.inapp': 'Nínú app',
      'prefs.wins': 'Ìṣẹ́gun àti ẹ̀bùn', 'prefs.payments': 'Ìfowópamọ́ àti yíyọ owó', 'prefs.referrals': 'Owó ìkọ́nilẹ́kọ̀ọ́',
      'prefs.draws': 'Ìránnilétí ìfà', 'prefs.promos': 'Ìfilọ̀ àti ẹ̀bùn',
      'prefs.saved': 'A ti fi ètò pamọ́', 'prefs.pushOff': 'Push ti pa lórí ẹ̀rọ yìí. Tan án láti gba ìkìlọ̀.',
      'prefs.enable': 'Tan push',
      'lang.title': 'Èdè',
      'autobuy.title': 'Ríra Láìfọwọ́yí', 'autobuy.save': 'Fi pamọ́', 'autobuy.cancel': 'Pa Ríra Láìfọwọ́yí',
      'autobuy.saved': 'A ti fi pamọ́', 'autobuy.off': 'A ti pa á',
    },
    ig: {
      'nav.home': 'Ụlọ', 'nav.tickets': 'Tiketi', 'nav.wallet': 'Akpa ego',
      'nav.help': 'Enyemaka', 'nav.deposit': 'Tinye Ego',
      'share.codeLabel': 'Debanye aha jiri koodu m',
      'share.title': 'Kaadị Nkekọrịta', 'share.button': 'Kekọrịta Kaadị',
      'share.hint': 'Foto nwere koodu gị — ọ dị mma maka WhatsApp Status na Instagram.',
      'share.use': 'Jiri koodu m {code} mgbe ị na-edebanye aha',
      'share.headline': 'Merie ezigbo ego kwa ụbọchị', 'share.cta': 'Sonye na Joy-Rise Hub',
      'share.generating': 'Na-eme kaadị gị…', 'share.saved': 'E chekwara kaadị na ngwaọrụ gị!',
      'share.failed': 'Enweghị ike ime kaadị. Biko nwaa ọzọ.',
      'proof.biggest': 'Mmeri kasị ukwuu n’izu a', 'proof.none': 'Onweghị onye meriri n’izu a — ọ nwere ike ịbụ gị n’ọdịnihu!',
      'proof.winners': 'Ndị mmeri {n} n’izu a', 'proof.see': 'Hụ ndị mmeri niile',
      'prefs.title': 'Nhọrọ Ọkwa', 'prefs.push': 'Push', 'prefs.inapp': 'N’ime app',
      'prefs.wins': 'Mmeri na onyinye', 'prefs.payments': 'Itinye na ịwepụ ego', 'prefs.referrals': 'Ego ndị a kpọrọ',
      'prefs.draws': 'Ncheta eserese', 'prefs.promos': 'Onyinye na bonus',
      'prefs.saved': 'E chekwara nhọrọ', 'prefs.pushOff': 'Push gbanyụrụ na ngwaọrụ a. Gbanye ya iji nweta ọkwa.',
      'prefs.enable': 'Gbanye push',
      'lang.title': 'Asụsụ',
      'autobuy.title': 'Ịzụta Na-akpaghị aka', 'autobuy.save': 'Chekwaa', 'autobuy.cancel': 'Gbanyụọ Ịzụta Na-akpaghị aka',
      'autobuy.saved': 'E chekwara', 'autobuy.off': 'E gbanyụrụ ya',
    },
    fr: {
      'nav.home': 'Accueil', 'nav.tickets': 'Tickets', 'nav.wallet': 'Portefeuille',
      'nav.help': 'Aide', 'nav.deposit': 'Dépôt',
      'share.codeLabel': 'Inscrivez-vous avec mon code',
      'share.title': 'Carte de partage', 'share.button': 'Partager la carte',
      'share.hint': 'Une image à votre code — idéale pour WhatsApp Status et Instagram.',
      'share.use': 'Utilisez mon code {code} à l’inscription',
      'share.headline': 'Gagnez de vrais gains chaque jour', 'share.cta': 'Rejoignez Joy-Rise Hub',
      'share.generating': 'Création de votre carte…', 'share.saved': 'Carte enregistrée !',
      'share.failed': 'Impossible de créer la carte. Réessayez.',
      'proof.biggest': 'Plus gros gain de la semaine', 'proof.none': 'Aucun gagnant cette semaine — ce sera peut-être vous !',
      'proof.winners': '{n} gagnants cette semaine', 'proof.see': 'Voir tous les gagnants',
      'prefs.title': 'Préférences de notification', 'prefs.push': 'Push', 'prefs.inapp': 'Dans l’app',
      'prefs.wins': 'Gains et prix', 'prefs.payments': 'Dépôts et retraits', 'prefs.referrals': 'Gains de parrainage',
      'prefs.draws': 'Rappels de tirage', 'prefs.promos': 'Offres et bonus',
      'prefs.saved': 'Préférences enregistrées', 'prefs.pushOff': 'Les notifications push sont désactivées sur cet appareil.',
      'prefs.enable': 'Activer le push',
      'lang.title': 'Langue',
      'autobuy.title': 'Achat automatique', 'autobuy.save': 'Enregistrer', 'autobuy.cancel': 'Désactiver l’achat automatique',
      'autobuy.saved': 'Enregistré', 'autobuy.off': 'Désactivé',
    },
  };

  // English nav label -> key, so the shared bottom navbar translates itself.
  const NAV_MAP = { 'Home': 'nav.home', 'Tickets': 'nav.tickets', 'Wallet': 'nav.wallet', 'Help': 'nav.help', 'Deposit': 'nav.deposit' };
  const LANG_KEY = 'joyrise_lang';

  function detect() {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGS[saved]) return saved;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS[nav] ? nav : 'en';
  }

  let current = detect();

  function t(key, vars) {
    let s = (DICT[current] && DICT[current][key]) || DICT.en[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    return s;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });

    root.querySelectorAll('.bottom-navbar .nav-item span, .bottom-navbar .fab-label').forEach((el) => {
      if (!el.dataset.i18nKey) {
        const key = NAV_MAP[(el.textContent || '').trim()];
        if (!key) return;
        el.dataset.i18nKey = key;
      }
      el.textContent = t(el.dataset.i18nKey);
    });
    document.documentElement.setAttribute('lang', current === 'pcm' ? 'en' : current);
  }

  function setLang(code) {
    if (!LANGS[code]) return;
    current = code;
    localStorage.setItem(LANG_KEY, code);
    apply();
    document.dispatchEvent(new CustomEvent('joyrise:langchange', { detail: { lang: code } }));
  }

  // Fills a <select> with the supported languages and wires it up.
  function mountPicker(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = Object.keys(LANGS).map((c) => `<option value="${c}">${LANGS[c]}</option>`).join('');
    selectEl.value = current;
    selectEl.addEventListener('change', () => setLang(selectEl.value));
  }

  window.JoyRiseI18n = { t, apply, setLang, mountPicker, getLang: () => current, LANGS };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply());
  else apply();
})(window);
