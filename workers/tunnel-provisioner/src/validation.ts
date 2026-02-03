/**
 * Subdomain Validation
 *
 * Rules:
 * - 3-32 characters
 * - Lowercase alphanumeric + hyphens
 * - No leading/trailing hyphens
 * - Not in reserved names blocklist
 * - Not offensive or brand-impersonating
 *
 * Lists sourced from:
 * - michaldudek/subdomain-blacklist (infrastructure + offensive terms)
 * - coffee-and-fun/google-profanity-words (comprehensive profanity list)
 * - Custom brand impersonation and phishing patterns
 */

/**
 * Reserved infrastructure/service names blocked via exact match.
 * These could impersonate services or confuse users.
 */
const RESERVED_NAMES = new Set([
  'about', 'abuse', 'acme', 'ad', 'admanager', 'admin',
  'admindashboard', 'administrator', 'ads', 'adsense', 'adword', 'affiliate',
  'affiliatepage', 'afp', 'alpha', 'analytic', 'android', 'answer',
  'ap', 'api', 'app', 'appengine', 'application', 'appnew',
  'asdf', 'asset', 'atf', 'backup', 'bank', 'base',
  'beginner', 'beta', 'billing', 'binarie', 'binary', 'blackberry',
  'blog', 'board', 'bookmark', 'bot', 'bug', 'business',
  'cache', 'calendar', 'catalog', 'cdn', 'cgi', 'chat',
  'checkout', 'chrome', 'client', 'cloud', 'code', 'commercial',
  'community', 'compare', 'compas', 'config', 'configuration', 'connect',
  'console', 'contact', 'control', 'core', 'corporate', 'cpanel',
  'create', 'css', 'custom', 'customer', 'daemon', 'dashboard',
  'data', 'database', 'db', 'debug', 'default', 'demo',
  'deploy', 'designer', 'desktop', 'dev', 'developer', 'development',
  'dir', 'directory', 'discussion', 'dns', 'doc', 'docs',
  'documentation', 'domain', 'domainadmin', 'download', 'drive', 'eclosion',
  'edit', 'editor', 'education', 'email', 'embed', 'encrypted',
  'engine', 'enterprise', 'event', 'explore', 'export', 'external',
  'faq', 'favorite', 'feature', 'feed', 'feedback', 'file',
  'finance', 'firewall', 'firmware', 'flash', 'fleet', 'flog',
  'font', 'forum', 'friend', 'ftp', 'gateway', 'get',
  'git', 'global', 'gm', 'graph', 'group', 'guest',
  'guide', 'hack', 'help', 'home', 'homepage', 'host',
  'hosting', 'hostmaster', 'html', 'http', 'httpd', 'https',
  'hub', 'imap', 'import', 'index', 'info', 'informat',
  'intranet', 'invite', 'ios', 'ipad', 'iphone', 'irc',
  'issue', 'item', 'java', 'javascript', 'job', 'js',
  'json', 'knowledgebase', 'lab', 'language', 'launch', 'ldap',
  'legal', 'license', 'link', 'linux', 'list', 'live',
  'load', 'local', 'locale', 'log', 'login', 'logout',
  'mac', 'mail', 'mailerdaemon', 'manage', 'manager', 'map',
  'marketing', 'marketplace', 'master', 'media', 'member', 'message',
  'messenger', 'metric', 'mine', 'mirror', 'mobile', 'model',
  'monarch', 'monitor', 'mx', 'my', 'mysql', 'network',
  'new', 'news', 'newsletter', 'nobody', 'noc', 'noreply',
  'notification', 'ns', 'ns1', 'ns2', 'ns3', 'ns4',
  'oauth', 'offer', 'office', 'online', 'openid', 'operator',
  'ops', 'order', 'org', 'origin', 'page', 'panel',
  'partner', 'password', 'pay', 'payment', 'personal', 'phone',
  'photo', 'php', 'pin', 'pixel', 'plan', 'platform',
  'player', 'plugin', 'plus', 'podcast', 'policy', 'pop',
  'pop3', 'popular', 'portal', 'post', 'postfix', 'postmaster',
  'premium', 'press', 'preview', 'price', 'pricing', 'privacy',
  'private', 'pro', 'product', 'production', 'profile', 'program',
  'project', 'promo', 'proxy', 'public', 'purchase', 'python',
  'query', 'queue', 'quote', 'radio', 'raw', 'rdp',
  'redirect', 'register', 'release', 'remote', 'report', 'request',
  'resolve', 'resolver', 'resource', 'response', 'result', 'review',
  'robot', 'root', 'route', 'router', 'rss', 'ruby',
  'rule', 'sale', 'sample', 'sandbox', 'schedule', 'script',
  'sdk', 'search', 'secure', 'security', 'seed', 'self',
  'sell', 'send', 'server', 'service', 'session', 'setting',
  'setup', 'share', 'shop', 'shopping', 'signin', 'signup',
  'site', 'sitemap', 'smtp', 'social', 'software', 'source',
  'spam', 'spec', 'special', 'sql', 'ssh', 'ssl',
  'ssladmin', 'ssladministrator', 'sslwebmaster', 'stage', 'staging', 'start',
  'stat', 'static', 'stats', 'status', 'store', 'stream',
  'student', 'style', 'subdomain', 'subscribe', 'sudo', 'super',
  'support', 'survey', 'svn', 'sync', 'sys', 'sysadmin',
  'system', 'tag', 'task', 'team', 'tech', 'telnet',
  'template', 'terminal', 'terms', 'test', 'testing', 'theme',
  'ticket', 'time', 'token', 'tool', 'topic', 'tor',
  'track', 'tracker', 'tracking', 'trade', 'translate', 'translation',
  'trend', 'trial', 'tunnel', 'tunnels', 'unsubscribe', 'update',
  'upgrade', 'upload', 'url', 'usage', 'user', 'username',
  'verify', 'version', 'video', 'virtual', 'vnc', 'voice',
  'vpn', 'web', 'webadmin', 'weblog', 'webmail', 'webmaster',
  'website', 'widget', 'wifi', 'wiki', 'win', 'window',
  'wpad', 'ww', 'www', 'www1', 'www2', 'www3',
  'xml', 'xmpp', 'xpg', 'xxx',
]);

/**
 * Offensive/suspicious terms blocked via substring match.
 * If any of these appear anywhere in a subdomain, it is rejected.
 * Filtered to exclude terms that cause false positives in common words.
 */
const BLOCKED_TERMS = [
  '2g1c', '4r5e', '5h1t', '5hit', 'a55', 'aboutu',
  'account', 'acrotomophilia', 'adult', 'amazon', 'anal', 'anilingus',
  'anu', 'anus', 'apeshit', 'apple', 'ar5e', 'arrse',
  'arse', 'arsehole', 'ass-fucker', 'ass-hat', 'ass-pirate', 'assbag',
  'assbandit', 'assbanger', 'assbite', 'assclown', 'asscock', 'asscracker',
  'asses', 'assface', 'assfucker', 'assfukka', 'assgoblin', 'asshat',
  'asshead', 'asshole', 'assholes', 'asshopper', 'assjacker', 'asslick',
  'asslicker', 'assmonkey', 'assmunch', 'assmuncher', 'asspirate', 'assshole',
  'asssucker', 'asswad', 'asswhole', 'asswipe', 'autoerotic', 'b00bs',
  'b17ch', 'b1tch', 'babeland', 'ballbag', 'ballsack', 'bampot',
  'bangbros', 'banking', 'bareback', 'barenaked', 'bastard', 'bastardo',
  'bastinado', 'bbw', 'bdsm', 'beaner', 'beaners', 'beastial',
  'beastiality', 'beastility', 'bellend', 'bestial', 'bestiality', 'biatch',
  'bimbos', 'birdlock', 'bitch', 'bitcher', 'bitchers', 'bitches',
  'bitchin', 'bitching', 'blogsearch', 'bloody', 'blowjob', 'blowjobs',
  'blumpkin', 'boiolas', 'bollock', 'bollocks', 'bollok', 'bollox',
  'bondage', 'boner', 'boobie', 'boobs', 'booobs', 'boooobs',
  'booooobs', 'booooooobs', 'breasts', 'buceta', 'bugger', 'bukkake',
  'bulldyke', 'bullshit', 'bunghole', 'busty', 'butt-pirate', 'buttcheeks',
  'butthole', 'buttmunch', 'buttplug', 'c0ck', 'c0cksucker', 'camgirl',
  'camslut', 'camwhore', 'carpetmuncher', 'cawk', 'chart', 'chinc',
  'chink', 'choad', 'chode', 'cipa', 'circlejerk', 'cl1t',
  'clit', 'clitface', 'clitori', 'clitoris', 'clits', 'cloudflare',
  'clusterfuck', 'cname', 'cnarne', 'cnut', 'cock', 'cock-sucker',
  'cockbite', 'cockburger', 'cockface', 'cockhead', 'cockjockey', 'cockknoker',
  'cockmaster', 'cockmongler', 'cockmongruel', 'cockmonkey', 'cockmunch', 'cockmuncher',
  'cocknose', 'cocknugget', 'cocks', 'cockshit', 'cocksmith', 'cocksmoker',
  'cocksuck', 'cocksucked', 'cocksucker', 'cocksucking', 'cocksucks', 'cocksuka',
  'cocksukka', 'cok', 'cokmuncher', 'coksucka', 'confirm', 'confirm-your',
  'confirmation', 'contact-u', 'contactu', 'content', 'controlpanel', 'coochie',
  'coochy', 'coon', 'coons', 'cooter', 'coprolagnia', 'coprophilia',
  'cornhole', 'countrie', 'country', 'creampie', 'cumbubble', 'cumdumpster',
  'cumguzzler', 'cumjockey', 'cummer', 'cumming', 'cums', 'cumshot',
  'cumslut', 'cumtart', 'cunilingus', 'cunillingus', 'cunnie', 'cunnilingus',
  'cunt', 'cuntface', 'cunthole', 'cuntlick', 'cuntlicker', 'cuntlicking',
  'cuntrag', 'cunts', 'cyalis', 'cyberfuc', 'cyberfuck', 'cyberfucked',
  'cyberfucker', 'cyberfuckers', 'cyberfucking', 'd1ck', 'dammit', 'darkie',
  'daterape', 'deepthroat', 'dendrophilia', 'deployment', 'devel', 'developement',
  'dick', 'dickbag', 'dickbeater', 'dickface', 'dickhead', 'dickhole',
  'dickjuice', 'dickmilk', 'dickmonger', 'dickslap', 'dicksucker', 'dickwad',
  'dickweasel', 'dickweed', 'dickwod', 'dike', 'dildo', 'dildos',
  'dingleberries', 'dingleberry', 'dinks', 'dipshit', 'dirsa', 'dlck',
  'document', 'dog-fucker', 'doggiestyle', 'doggin', 'dogging', 'doggystyle',
  'dolcett', 'domination', 'dominatrix', 'dommes', 'donate', 'donkeyribber',
  'doochbag', 'dookie', 'doosh', 'douche', 'douchebag', 'duche',
  'dumbshit', 'dumshit', 'dvda', 'dyke', 'earth', 'ecchi',
  'eclosion', 'ejaculate', 'ejaculated', 'ejaculates', 'ejaculating', 'ejaculatings',
  'ejaculation', 'ejakulate', 'enable', 'erotic', 'erotism', 'error',
  'errorlog', 'escort', 'eunuch', 'f4nny', 'facebook', 'fagbag',
  'fagg', 'fagging', 'faggit', 'faggitt', 'faggot', 'faggs',
  'fagot', 'fagots', 'fags', 'fagtard', 'fanny', 'fannyflaps',
  'fannyfucker', 'fanyy', 'farted', 'farting', 'farty', 'fatass',
  'fcuk', 'fcuker', 'fcuking', 'fecal', 'feck', 'fecker',
  'feedburner', 'feedproxy', 'felatio', 'felch', 'felching', 'fellate',
  'fellatio', 'feltch', 'femdom', 'figging', 'fingerbang', 'fingerfuck',
  'fingerfucked', 'fingerfucker', 'fingerfuckers', 'fingerfucking', 'fingerfucks', 'fingering',
  'fistfuck', 'fistfucked', 'fistfucker', 'fistfuckers', 'fistfucking', 'fistfuckings',
  'fistfucks', 'fisting', 'flamer', 'flange', 'folder', 'fook',
  'fooker', 'footjob', 'forgotpassword', 'frotting', 'fuck', 'fucka',
  'fucked', 'fucker', 'fuckers', 'fuckhead', 'fuckheads', 'fuckin',
  'fucking', 'fuckings', 'fuckingshitmotherfucker', 'fuckme', 'fucks', 'fucktards',
  'fuckwhit', 'fuckwit', 'fudgepacker', 'fuk', 'fuker', 'fukker',
  'fukkin', 'fuks', 'fukwhit', 'fukwit', 'fusion', 'futanari',
  'fux', 'fux0r', 'g-spot', 'gadget', 'gangbang', 'gangbanged',
  'gangbangs', 'gayass', 'gaybob', 'gaydo', 'gaylord', 'gaysex',
  'gaytard', 'gaywad', 'genitals', 'geographic', 'gettingstarted', 'github',
  'gitlab', 'gmail', 'goatcx', 'goatse', 'god-dam', 'god-damned',
  'goddamn', 'goddamned', 'gokkun', 'gooch', 'goodpoop', 'google',
  'gook', 'goregasm', 'gringo', 'grope', 'guido', 'guro',
  'handjob', 'hardcore', 'hardcoresex', 'heeb', 'hentai', 'heshe',
  'hoare', 'homoerotic', 'honkey', 'honky', 'hooker', 'horniest',
  'horny', 'hotsex', 'htrnl', 'humping', 'image', 'incest',
  'instagram', 'intercourse', 'investor', 'invoice', 'irnage', 'jack-off',
  'jackass', 'jackoff', 'jailbait', 'jenkin', 'jerk-off', 'jigaboo',
  'jiggaboo', 'jiggerboo', 'jism', 'jiz', 'jizm', 'jizz',
  'juggs', 'kawk', 'kike', 'kinbaku', 'kinkster', 'kinky',
  'kiunt', 'knobbing', 'knobead', 'knobed', 'knobend', 'knobhead',
  'knobjocky', 'knobjokey', 'kock', 'kondum', 'kondums', 'kooch',
  'kootch', 'kumer', 'kummer', 'kumming', 'kums', 'kunilingus',
  'kunt', 'kyke', 'l3itch', 'labia', 'lesbo', 'lezzie',
  'lmfao', 'location', 'login', 'lolita', 'lovemaking', 'lusting',
  'm0f0', 'm0fo', 'm45terbate', 'ma5terb8', 'ma5terbate', 'masochist',
  'master-bate', 'masterb8', 'masterbat3', 'masterbate', 'masterbation', 'masterbations',
  'masturbate', 'microsoft', 'milf', 'minge', 'mo-fo', 'mof0',
  'mofo', 'monarch', 'money', 'mothafuck', 'mothafucka', 'mothafuckas',
  'mothafuckaz', 'mothafucked', 'mothafucker', 'mothafuckers', 'mothafuckin', 'mothafucking',
  'mothafuckings', 'mothafucks', 'motherfuck', 'motherfucked', 'motherfucker', 'motherfuckers',
  'motherfuckin', 'motherfucking', 'motherfuckings', 'motherfuckka', 'motherfucks', 'movie',
  'muffdiver', 'muffdiving', 'mutha', 'muthafecker', 'muthafuckker', 'muther',
  'mutherfucker', 'mystore', 'n1gga', 'n1gger', 'nambla', 'nawashi',
  'nazi', 'negro', 'neonazi', 'netflix', 'newsite', 'nigg3r',
  'nigg4h', 'nigga', 'niggah', 'niggas', 'niggaz', 'nigger',
  'niggers', 'niglet', 'nimphomania', 'nipple', 'nipples', 'nobhead',
  'nobjocky', 'nobjokey', 'nudity', 'numbnuts', 'nutsack', 'nympho',
  'nymphomania', 'octopussy', 'omorashi', 'orgasim', 'orgasims', 'orgasm',
  'orgasms', 'orgy', 'other', 'p0rn', 'packagist', 'paedophile',
  'panooch', 'panties', 'panty', 'partnerpage', 'password', 'paypal',
  'pecker', 'peckerhead', 'pedobear', 'pedophile', 'pegging', 'penis',
  'penisfucker', 'people', 'person', 'phonesex', 'phuck', 'phuk',
  'phuked', 'phuking', 'phukked', 'phukking', 'phuks', 'phuq',
  'pigfucker', 'pimpis', 'pises', 'pisin', 'pising', 'pisof',
  'piss', 'pissed', 'pisser', 'pissers', 'pisses', 'pissflap',
  'pissflaps', 'pissin', 'pissing', 'pissoff', 'pisspig', 'place',
  'playboy', 'polesmoker', 'pollock', 'ponyplay', 'poof', 'poon',
  'poonani', 'poonany', 'poontang', 'poop', 'poopchute', 'porn',
  'porno', 'pornography', 'pornos', 'pr0n', 'prick', 'pricks',
  'print', 'promotion', 'proxie', 'proxies', 'pthc', 'pube',
  'pubes', 'punanny', 'punany', 'punta', 'pusies', 'pusse',
  'pussi', 'pussies', 'pussy', 'pussylicking', 'pussys', 'pusy',
  'puto', 'queaf', 'queef', 'queer', 'queerbait', 'queerhole',
  'querie', 'queries', 'quim', 'raghead', 'random', 'raping',
  'rapist', 'reader', 'recover', 'rectum', 'registration', 'renob',
  'research', 'reset-your', 'retard', 'rimjaw', 'rimjob', 'rimming',
  'rnail', 'rnicrosoft', 'ruski', 'sadism', 'sadist', 'santorum',
  'schlong', 'scholar', 'scissoring', 'screwing', 'scroat', 'scrote',
  'scrotum', 'secure', 'seminar', 'sexo', 'sexy', 'sh1t',
  'shag', 'shagger', 'shaggin', 'shagging', 'shemale', 'shibari',
  'shit', 'shit-ass', 'shit-bag', 'shit-bagger', 'shit-brain', 'shit-breath',
  'shit-cunt', 'shit-dick', 'shit-eating', 'shit-face', 'shit-faced', 'shit-fit',
  'shit-head', 'shit-heel', 'shit-hole', 'shit-house', 'shit-load', 'shit-pot',
  'shit-spitter', 'shit-stain', 'shitass', 'shitbag', 'shitbagger', 'shitblimp',
  'shitbrain', 'shitbreath', 'shitcunt', 'shitdick', 'shite', 'shiteating',
  'shited', 'shitey', 'shitface', 'shitfaced', 'shitfit', 'shitfuck',
  'shitfull', 'shithead', 'shitheel', 'shithole', 'shithouse', 'shiting',
  'shitings', 'shitload', 'shitpot', 'shits', 'shitspitter', 'shitstain',
  'shitted', 'shitter', 'shitters', 'shittiest', 'shitting', 'shittings',
  'shitty', 'shity', 'shiz', 'shiznit', 'shortcut', 'shota',
  'shrimping', 'signin', 'signup', 'sitenew', 'skank', 'skeet',
  'sketchup', 'slanteye', 'slash', 'slashinvoice', 'slut', 'slutbag',
  'sluts', 'smeg', 'smegma', 'snowballing', 'sodomize', 'sodomy',
  'son-of-a-bitch', 'sorry', 'spick', 'splooge', 'spooge', 'spreadsheet',
  'spunk', 'srntp', 'statistic', 'statu', 'strapon', 'strappado',
  'stripe', 'sucker', 'sucks', 'suggest', 'suggestquerie', 'suggestquery',
  'surveytool', 'swastika', 'swinger', 't1tt1e5', 't1tties', 'talkgadget',
  'tard', 'teets', 'teez', 'tester', 'testical', 'testicle',
  'threesome', 'throating', 'thundercunt', 'tiktok', 'titfuck', 'tits',
  'titt', 'tittie5', 'tittiefucker', 'titties', 'titty', 'tittyfuck',
  'tittywank', 'titwank', 'toolbar', 'topless', 'tosser', 'towelhead',
  'tranny', 'translator', 'tribadism', 'tubgirl', 'tushy', 'tw4t',
  'twat', 'twathead', 'twatlips', 'twatty', 'twink', 'twinkie',
  'twitter', 'twunt', 'twunter', 'undressing', 'update-your', 'upskirt',
  'urophilia', 'v14gra', 'v1gra', 'va-j-j', 'vagina', 'validation',
  'verify', 'viagra', 'vibrator', 'video-stat', 'vjayjay', 'vorarephilia',
  'voyeur', 'vulva', 'w00se', 'wanker', 'wanky', 'webdisk',
  'webrnail', 'wetback', 'whoar', 'whore', 'willies', 'willy',
  'xhtml', 'xhtrnl', 'xrated', 'xxx', 'yaoi', 'yiffy',
  'youtube', 'zoophilia',
];

const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSubdomain(name: string): ValidationResult {
  if (!name) {
    return { valid: false, error: 'Subdomain is required' };
  }

  const normalized = name.toLowerCase();

  if (normalized.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters' };
  }

  if (normalized.length > 32) {
    return { valid: false, error: 'Subdomain must be 32 characters or fewer' };
  }

  if (!SUBDOMAIN_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'Subdomain must contain only lowercase letters, numbers, and hyphens (no leading/trailing hyphens)',
    };
  }

  if (RESERVED_NAMES.has(normalized)) {
    return { valid: false, error: 'This subdomain is reserved' };
  }

  // Check for offensive/suspicious substrings
  const blocked = BLOCKED_TERMS.find((term) => normalized.includes(term));
  if (blocked) {
    return { valid: false, error: 'This subdomain is not allowed' };
  }

  return { valid: true };
}
