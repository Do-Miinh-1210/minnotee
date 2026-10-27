/* Windows Metafile (WMF) to SVG converter for MathType equations in Word (.docx).
 * Pure JavaScript, standalone, zero dependencies. Runs in browser, Electron, and Node.js.
 */
(()=>{
'use strict';

const SYMBOL_MAP = {
  0x20: ' ', 0x21: '!', 0x22: '∀', 0x23: '#', 0x24: '∃', 0x25: '%', 0x26: '&', 0x27: '∍',
  0x28: '(', 0x29: ')', 0x2A: '∗', 0x2B: '+', 0x2C: ',', 0x2D: '−', 0x2E: '.', 0x2F: '/',
  0x30: '0', 0x31: '1', 0x32: '2', 0x33: '3', 0x34: '4', 0x35: '5', 0x36: '6', 0x37: '7',
  0x38: '8', 0x39: '9', 0x3A: ':', 0x3B: ';', 0x3C: '<', 0x3D: '=', 0x3E: '>', 0x3F: '?',
  0x40: '≅', 0x41: 'Α', 0x42: 'Β', 0x43: 'Χ', 0x44: 'Δ', 0x45: 'Ε', 0x46: 'Φ', 0x47: 'Γ',
  0x48: 'Η', 0x49: 'Ι', 0x4A: 'ϑ', 0x4B: 'Κ', 0x4C: 'Λ', 0x4D: 'Μ', 0x4E: 'Ν', 0x4F: 'Ο',
  0x50: 'Π', 0x51: 'Θ', 0x52: 'Ρ', 0x53: 'Σ', 0x54: 'Τ', 0x55: 'Υ', 0x56: 'ς', 0x57: 'Ω',
  0x58: 'Ξ', 0x59: 'Ψ', 0x5A: 'Ζ', 0x5B: '[', 0x5C: '∴', 0x5D: ']', 0x5E: '⊥', 0x5F: '_',
  0x60: '‾', 0x61: 'α', 0x62: 'β', 0x63: 'χ', 0x64: 'δ', 0x65: 'ε', 0x66: 'ϕ', 0x67: 'γ',
  0x68: 'η', 0x69: 'ι', 0x6A: 'φ', 0x6B: 'κ', 0x6C: 'λ', 0x6D: 'μ', 0x6E: 'ν', 0x6F: 'ο',
  0x70: 'π', 0x71: 'θ', 0x72: 'ρ', 0x73: 'σ', 0x74: 'τ', 0x75: 'υ', 0x76: 'ϖ', 0x77: 'ω',
  0x78: 'ξ', 0x79: 'ψ', 0x7A: 'ζ', 0x7B: '{', 0x7C: '|', 0x7D: '}', 0x7E: '∼',
  0xA0: '€', 0xA1: 'ϒ', 0xA2: '′', 0xA3: '≤', 0xA4: '⁄', 0xA5: '∞', 0xA6: 'ƒ', 0xA7: '♣',
  0xA8: '♦', 0xA9: '♥', 0xAA: '♠', 0xAB: '↔', 0xAC: '←', 0xAD: '↑', 0xAE: '→', 0xAF: '↓',
  0xB0: '°', 0xB1: '±', 0xB2: '″', 0xB3: '≥', 0xB4: '×', 0xB5: '∝', 0xB6: '∂', 0xB7: '•',
  0xB8: '÷', 0xB9: '≠', 0xBA: '≡', 0xBB: '≈', 0xBC: '…', 0xBD: '⏐', 0xBE: '⎯', 0xBF: '↵',
  0xC0: 'ℵ', 0xC1: 'ℑ', 0xC2: 'ℜ', 0xC3: '℘', 0xC4: '⊗', 0xC5: '⊕', 0xC6: '∅', 0xC7: '∩',
  0xC8: '∪', 0xC9: '⊃', 0xCA: '⊇', 0xCB: '⊄', 0xCC: '⊂', 0xCD: '⊆', 0xCE: '∈', 0xCF: '∉',
  0xD0: '∠', 0xD1: '∇', 0xD2: '®', 0xD3: '©', 0xD4: '™', 0xD5: '∏', 0xD6: '√', 0xD7: '⋅',
  0xD8: '¬', 0xD9: '∧', 0xDA: '∨', 0xDB: '⇔', 0xDC: '⇐', 0xDD: '⇑', 0xDE: '⇒', 0xDF: '⇓',
  0xE0: '◊', 0xE1: '〈', 0xE2: '®', 0xE3: '©', 0xE4: '™', 0xE5: '∑',
  0xF1: '〉', 0xF2: '∫'
};

const BRACKET_CODES = new Set([
  0xE6, 0xE7, 0xE8, // Left paren (top, mid, bot)
  0xF6, 0xF7, 0xF8, // Right paren (top, mid, bot)
  0xE9, 0xEA, 0xEB, // Left bracket (top, mid, bot)
  0xF9, 0xFA, 0xFB, // Right bracket (top, mid, bot)
  0xEC, 0xED, 0xEE, 0xEF, // Left brace (top, mid, bot, ext)
  0xFC, 0xFD, 0xFE, // Right brace (top, mid, bot)
  0xF3, 0xF4, 0xF5  // Integral (top, mid, bot)
]);

function getBracketFamily(code) {
  if (code === 0xE6 || code === 0xE7 || code === 0xE8) return 'lparen';
  if (code === 0xF6 || code === 0xF7 || code === 0xF8) return 'rparen';
  if (code === 0xE9 || code === 0xEA || code === 0xEB) return 'lbracket';
  if (code === 0xF9 || code === 0xFA || code === 0xFB) return 'rbracket';
  if (code === 0xEC || code === 0xED || code === 0xEE || code === 0xEF) return 'lbrace';
  if (code === 0xFC || code === 0xFD || code === 0xFE) return 'rbrace';
  if (code === 0xF3 || code === 0xF4 || code === 0xF5) return 'integral';
  return 'other';
}

function assembleBrackets(bracketPieces, svgElements) {
  if (!bracketPieces || !bracketPieces.length) return;
  bracketPieces.sort((a, b) => a.x - b.x || a.y - b.y);

  const groups = [];
  for (const piece of bracketPieces) {
    const fam = getBracketFamily(piece.code);
    let group = groups.find(g => g.family === fam && Math.abs(g.x - piece.x) <= 45);
    if (!group) {
      group = { x: piece.x, family: fam, pieces: [] };
      groups.push(group);
    }
    group.pieces.push(piece);
    group.x = Math.round(group.pieces.reduce((s, p) => s + p.x, 0) / group.pieces.length);
  }

  for (const g of groups) {
    const pieces = g.pieces;
    const ys = pieces.map(p => p.y);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const avgH = Math.round(pieces.reduce((s, p) => s + p.fontHeight, 0) / pieces.length);
    const color = pieces[0].color || 'currentColor';
    const topY = minY - Math.round(avgH * 0.72);
    const botY = maxY + Math.round(avgH * 0.10);
    const totalH = botY - topY;
    const w = Math.round(avgH * 0.32);
    const sw = Math.max(16, Math.round(avgH * 0.052));
    const X = g.x;

    switch (g.family) {
      case 'lparen':
        svgElements.push(`<path d="M ${X + w} ${topY} C ${X - Math.round(w * 0.45)} ${topY + Math.round(totalH * 0.22)}, ${X - Math.round(w * 0.45)} ${botY - Math.round(totalH * 0.22)}, ${X + w} ${botY}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`);
        break;
      case 'rparen':
        svgElements.push(`<path d="M ${X - w} ${topY} C ${X + Math.round(w * 0.45)} ${topY + Math.round(totalH * 0.22)}, ${X + Math.round(w * 0.45)} ${botY - Math.round(totalH * 0.22)}, ${X - w} ${botY}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`);
        break;
      case 'lbracket':
        svgElements.push(`<path d="M ${X + w} ${topY} H ${X} V ${botY} H ${X + w}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="miter"/>`);
        break;
      case 'rbracket':
        svgElements.push(`<path d="M ${X - w} ${topY} H ${X} V ${botY} H ${X - w}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="miter"/>`);
        break;
      case 'lbrace':
        {
          const midY = Math.round((topY + botY) / 2);
          svgElements.push(`<path d="M ${X + w} ${topY} Q ${X} ${topY}, ${X} ${topY + Math.round((midY - topY) * 0.4)} Q ${X} ${midY}, ${X - Math.round(w * 0.5)} ${midY} Q ${X} ${midY}, ${X} ${midY + Math.round((botY - midY) * 0.6)} Q ${X} ${botY}, ${X + w} ${botY}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`);
        }
        break;
      case 'rbrace':
        {
          const midY = Math.round((topY + botY) / 2);
          svgElements.push(`<path d="M ${X - w} ${topY} Q ${X} ${topY}, ${X} ${topY + Math.round((midY - topY) * 0.4)} Q ${X} ${midY}, ${X + Math.round(w * 0.5)} ${midY} Q ${X} ${midY}, ${X} ${midY + Math.round((botY - midY) * 0.6)} Q ${X} ${botY}, ${X - w} ${botY}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`);
        }
        break;
      case 'integral':
        {
          const midY = Math.round((topY + botY) / 2);
          svgElements.push(`<path d="M ${X + w} ${topY} C ${X + Math.round(w * 0.2)} ${topY}, ${X} ${topY + Math.round(totalH * 0.1)}, ${X} ${midY} C ${X} ${botY - Math.round(totalH * 0.1)}, ${X - Math.round(w * 0.2)} ${botY}, ${X - w} ${botY}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`);
        }
        break;
    }
  }
}

function readU16(b, o){ return b[o] | (b[o+1]<<8); }
function readI16(b, o){ const v = b[o] | (b[o+1]<<8); return (v & 0x8000) ? v - 0x10000 : v; }
function readU32(b, o){ return (b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]<<24)) >>> 0; }

// Pure JavaScript MTEF to LaTeX parser
const MTEF_SYMBOL_MAP = {"97": "\\alpha", "98": "\\beta", "99": "\\chi", "100": "\\delta", "101": "\\varepsilon", "102": "\\phi", "103": "\\gamma", "104": "\\eta", "105": "\\iota", "106": "\\varphi", "107": "\\kappa", "108": "\\lambda", "109": "\\mu", "110": "\\nu", "111": "o", "112": "\\pi", "113": "\\theta", "114": "\\rho", "115": "\\sigma", "116": "\\tau", "117": "\\upsilon", "118": "\\varpi", "119": "\\omega", "120": "\\xi", "121": "\\psi", "122": "\\zeta", "65": "A", "66": "B", "67": "X", "68": "\\Delta", "69": "E", "70": "\\Phi", "71": "\\Gamma", "72": "\\Theta", "73": "I", "74": "\\vartheta", "75": "K", "76": "\\Lambda", "77": "M", "78": "N", "79": "O", "80": "\\Pi", "81": "\\Theta", "82": "P", "83": "\\Sigma", "84": "T", "85": "\\Upsilon", "86": "\\varsigma", "87": "\\Omega", "88": "\\Xi", "89": "\\Psi", "90": "Z", "180": "\\prime", "162": "\\times", "184": "\\div", "45": "-", "177": "\\pm", "2028": "|", "2284": "|", "43267": "\\Omega", "164": "/", "215": "\\cdot", "176": "^{\\circ}", "198": "\\partial", "199": "\\nabla", "209": "\\aleph", "192": "\\infty", "165": "\\propto", "195": "\\angle", "210": "\\wp", "211": "\\Re", "212": "\\Im", "168": "\\otimes", "196": "\\oplus", "197": "\\cap", "200": "\\cup", "201": "\\supset", "203": "\\supseteq", "204": "\\notin", "205": "\\subset", "206": "\\subseteq", "207": "\\in", "166": "\\neq", "167": "\\equiv", "169": "\\cong", "187": "\\le", "188": "\\ge", "185": "\\ll", "186": "\\gg", "94": "\\perp", "178": "\\bullet", "181": "\\parallel", "214": "\\spadesuit", "216": "\\clubsuit", "217": "\\diamondsuit", "218": "\\heartsuit", "34": "\\forall", "36": "\\exists", "208": "\\emptyset", "161": "\\sim", "171": "\\leftrightarrow", "172": "\\Leftarrow", "173": "\\Uparrow", "174": "\\Rightarrow", "175": "\\Downarrow", "61": "=", "60": "<", "62": ">", "40": "(", "41": ")", "91": "[", "93": "]", "123": "\\{", "125": "\\}", "229": "\\sum", "242": "\\int", "244": "\\oint", "243": "\\prod", "213": "\\coprod", "226": "\\wedge", "227": "\\vee", "224": "\\land", "225": "\\lor", "42": "*", "43": "+", "44": ",", "46": ".", "47": "/", "58": ":", "59": ";", "92": "\\backslash ", "124": "|", "126": "\\sim ", "163": "\\le ", "170": "\\leftarrow ", "179": "\\ge ", "189": "\\approx ", "190": "\\neq ", "191": "\\equiv ", "228": "\\diamond ", "230": "\\sqrt{}", "231": "\\cdot ", "232": "\\neg ", "233": "\\wedge ", "234": "\\vee ", "235": "\\Leftrightarrow ", "236": "\\leftarrow ", "237": "\\uparrow ", "238": "\\rightarrow ", "239": "\\downarrow "};
const MTEF_UNICODE_MAP = {"176": "^{\\circ}", "8722": "-", "8730": "\\sqrt{}", "8800": "\\neq", "8804": "\\le", "8805": "\\ge", "215": "\\times", "247": "\\div", "937": "\\Omega ", "60423": "", "60424": "", "945": "\\alpha", "946": "\\beta", "947": "\\gamma", "948": "\\delta", "949": "\\varepsilon", "952": "\\theta", "955": "\\lambda", "956": "\\mu", "960": "\\pi", "963": "\\sigma", "966": "\\varphi", "969": "\\omega", "8734": "\\infty", "8747": "\\int ", "8721": "\\sum", "8719": "\\prod", "8706": "\\partial", "8711": "\\nabla", "8704": "\\forall", "8707": "\\exists", "8709": "\\emptyset", "8746": "\\cup", "8745": "\\cap", "8834": "\\subset", "8835": "\\supset", "8838": "\\subseteq", "8839": "\\supseteq", "8712": "\\in", "8713": "\\notin", "8594": "\\rightarrow", "8592": "\\leftarrow", "8596": "\\leftrightarrow", "8658": "\\Rightarrow", "8656": "\\Leftarrow", "8660": "\\Leftrightarrow", "8970": "\\lfloor", "8971": "\\rfloor", "8968": "\\lceil", "8969": "\\rceil", "10216": "\\langle", "10217": "\\rangle", "8484": "\\mathbb{Z}", "8477": "\\mathbb{R}", "8469": "\\mathbb{N}", "8474": "\\mathbb{Q}", "8450": "\\mathbb{C}", "8776": "\\approx", "8901": "\\cdot", "8943": "\\cdots ", "8230": "\\dots ", "8942": "\\vdots ", "8945": "\\ddots ", "916": "\\Delta ", "17791": "E", "8467": "\\ell ", "8491": "\\mathring{A}", "197": "\\mathring{A}", "8593": "\\uparrow ", "8595": "\\downarrow ", "8723": "\\mp ", "8764": "\\sim ", "8771": "\\simeq ", "8810": "\\ll ", "8811": "\\gg ", "8211": "-", "8212": "-", "224": "\\text{\u00e0}", "512": "", "1003": "", "53894": "", "60425": "", "60426": "", "61185": "", "272": "\u0110", "273": "\\text{\u0111}", "61186": "", "61188": "", "61192": " ", "8407": "", "770": "", "160": " ", "8194": " ", "8195": " ", "8196": " ", "8197": " ", "8198": " ", "8199": " ", "8200": " ", "8201": " ", "8202": " ", "8203": "", "8288": "", "65279": "", "8208": "-", "8209": "-", "8210": "-", "8216": "'", "8217": "'", "8220": "\"", "8221": "\"", "8242": "\\prime ", "8243": "\\prime\\prime ", "8244": "\\prime\\prime\\prime ", "8260": "/", "8725": "/", "65128": "\\backslash ", "8304": "^{0}", "185": "^{1}", "178": "^{2}", "179": "^{3}", "8308": "^{4}", "8309": "^{5}", "8310": "^{6}", "8311": "^{7}", "8312": "^{8}", "8313": "^{9}", "8314": "^{+}", "8315": "^{-}", "8316": "^{=}", "8317": "^{(}", "8318": "^{)}", "8305": "^{i}", "8319": "^{n}", "8320": "_{0}", "8321": "_{1}", "8322": "_{2}", "8323": "_{3}", "8324": "_{4}", "8325": "_{5}", "8326": "_{6}", "8327": "_{7}", "8328": "_{8}", "8329": "_{9}", "8330": "_{+}", "8331": "_{-}", "8332": "_{=}", "8333": "_{(}", "8334": "_{)}", "8336": "_{a}", "8337": "_{e}", "8338": "_{o}", "8339": "_{x}", "8341": "_{h}", "8342": "_{k}", "8343": "_{l}", "8344": "_{m}", "8345": "_{n}", "8346": "_{p}", "8347": "_{s}", "8348": "_{t}", "950": "\\zeta ", "951": "\\eta ", "953": "\\iota ", "954": "\\kappa ", "957": "\\nu ", "958": "\\xi ", "959": "o", "961": "\\rho ", "962": "\\varsigma ", "964": "\\tau ", "965": "\\upsilon ", "967": "\\chi ", "968": "\\psi ", "981": "\\varphi ", "982": "\\varpi ", "977": "\\vartheta ", "1009": "\\varrho ", "1013": "\\epsilon ", "181": "\\mu ", "913": "A", "914": "B", "915": "\\Gamma ", "917": "E", "918": "Z", "919": "H", "920": "\\Theta ", "921": "I", "922": "K", "923": "\\Lambda ", "924": "M", "925": "N", "926": "\\Xi ", "927": "O", "928": "\\Pi ", "929": "P", "931": "\\Sigma ", "932": "T", "933": "\\Upsilon ", "934": "\\Phi ", "935": "X", "936": "\\Psi ", "8486": "\\Omega ", "8463": "\\hbar ", "8462": "h", "8496": "\\mathcal{E}", "8497": "\\mathcal{F}", "8459": "\\mathcal{H}", "8466": "\\mathcal{L}", "8472": "\\wp ", "8487": "\\mho ", "8451": "^{\\circ}\\mathrm{C}", "8457": "^{\\circ}\\mathrm{F}", "8708": "\\nexists ", "8710": "\\Delta ", "8715": "\\ni ", "8716": "\\not\\ni ", "8718": "\\blacksquare ", "8724": "\\dotplus ", "8726": "\\setminus ", "8727": "*", "8728": "\\circ ", "8729": "\\bullet ", "8731": "\\sqrt[3]{}", "8732": "\\sqrt[4]{}", "8733": "\\propto ", "8736": "\\angle ", "8737": "\\measuredangle ", "8738": "\\sphericalangle ", "8739": "\\mid ", "8740": "\\nmid ", "8741": "\\parallel ", "8742": "\\nparallel ", "8743": "\\wedge ", "8744": "\\vee ", "8748": "\\iint ", "8749": "\\iiint ", "8750": "\\oint ", "8756": "\\therefore ", "8757": "\\because ", "8758": ":", "8759": "::", "8760": "\\dotminus ", "8761": "\\stackrel{?}{=}", "8762": "\\mathbin{:}", "8765": "\\backsim ", "8768": "\\wr ", "8769": "\\nsim ", "8770": "\\eqsim ", "8773": "\\cong ", "8774": "\\approx ", "8775": "\\ncong ", "8777": "\\not\\approx ", "8778": "\\approxeq ", "8781": "\\asymp ", "8784": "\\doteq ", "8785": "\\doteqdot ", "8786": "\\fallingdotseq ", "8787": "\\risingdotseq ", "8788": ":=", "8789": "=:", "8790": "\\eqcirc ", "8791": "\\circeq ", "8793": "\\wedgeq ", "8794": "\\veeeq ", "8796": "\\triangleq ", "8801": "\\equiv ", "8802": "\\not\\equiv ", "8803": "\\Equiv ", "8806": "\\leqq ", "8807": "\\geqq ", "8808": "\\lneqq ", "8809": "\\gneqq ", "8814": "\\nless ", "8815": "\\ngtr ", "8816": "\\nleq ", "8817": "\\ngeq ", "8818": "\\lesssim ", "8819": "\\gtrsim ", "8822": "\\lessgtr ", "8823": "\\gtrless ", "8826": "\\prec ", "8827": "\\succ ", "8828": "\\preceq ", "8829": "\\succeq ", "8832": "\\nprec ", "8833": "\\nsucc ", "8836": "\\not\\subset ", "8837": "\\not\\supset ", "8840": "\\nsubseteq ", "8841": "\\nsupseteq ", "8842": "\\subsetneq ", "8843": "\\supsetneq ", "8846": "\\uplus ", "8847": "\\sqsubset ", "8848": "\\sqsupset ", "8849": "\\sqsubseteq ", "8850": "\\sqsupseteq ", "8851": "\\sqcap ", "8852": "\\sqcup ", "8853": "\\oplus ", "8854": "\\ominus ", "8855": "\\otimes ", "8856": "\\oslash ", "8857": "\\odot ", "8858": "\\circledcirc ", "8859": "\\circledast ", "8866": "\\vdash ", "8867": "\\dashv ", "8868": "\\top ", "8869": "\\perp ", "8872": "\\models ", "8896": "\\bigwedge ", "8897": "\\bigvee ", "8898": "\\bigcap ", "8899": "\\bigcup ", "8900": "\\diamond ", "8902": "\\star ", "8904": "\\bowtie ", "8920": "\\lll ", "8921": "\\ggg ", "8597": "\\updownarrow ", "8598": "\\nwarrow ", "8599": "\\nearrow ", "8600": "\\searrow ", "8601": "\\swarrow ", "8602": "\\nleftarrow ", "8603": "\\nrightarrow ", "8605": "\\rightsquigarrow ", "8608": "\\twoheadrightarrow ", "8610": "\\leftarrowtail ", "8611": "\\rightarrowtail ", "8614": "\\mapsto ", "8617": "\\hookleftarrow ", "8618": "\\hookrightarrow ", "8636": "\\leftharpoonup ", "8637": "\\leftharpoondown ", "8640": "\\rightharpoonup ", "8641": "\\rightharpoondown ", "8644": "\\rightleftarrows ", "8646": "\\leftrightarrows ", "8652": "\\rightleftharpoons ", "8653": "\\nLeftarrow ", "8654": "\\nLeftrightarrow ", "8655": "\\nRightarrow ", "8657": "\\Uparrow ", "8659": "\\Downarrow ", "8661": "\\Updownarrow ", "8672": "\\dashleftarrow ", "8674": "\\dashrightarrow ", "10229": "\\longleftarrow ", "10230": "\\longrightarrow ", "10231": "\\longleftrightarrow ", "10232": "\\Longleftarrow ", "10233": "\\Longrightarrow ", "10234": "\\Longleftrightarrow ", "10236": "\\longmapsto ", "9001": "\\langle ", "9002": "\\rangle ", "9182": "\\overbrace{}", "9183": "\\underbrace{}", "9474": "|", "10072": "|", "124": "|", "8214": "\\|", "9633": "\\square ", "9651": "\\triangle ", "9650": "\\blacktriangle ", "9675": "\\circ ", "9679": "\\bullet ", "177": "\\pm ", "172": "\\neg ", "183": "\\cdot ", "165": "\\yen ", "163": "\\pounds ", "8364": "\\mathrm{EUR}", "8470": "\\mathrm{No.}"};
const MTEF_MTEXTRA_MAP = {"40": "(", "41": ")", "91": "[", "93": "]", "123": "\\{", "125": "\\}", "225": "\\langle", "241": "\\rangle", "236": "\\lceil", "239": "\\rceil", "235": "\\lfloor", "238": "\\rfloor", "47": "/", "92": "\\backslash ", "124": "|", "161": "\\langle ", "162": "\\rangle ", "163": "\\lceil ", "164": "\\rceil ", "165": "\\lfloor ", "166": "\\rfloor ", "192": "\\sum ", "193": "\\prod ", "194": "\\coprod ", "210": "\\sqrt{}", "211": "\\int ", "212": "\\oint ", "232": "\\leftarrow ", "233": "\\rightarrow ", "234": "\\leftrightarrow "};

class MtefParser {
  constructor(data) {
    this.data = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.pos = 0;
    this.output = [];
    this.fontDefs = [];
    this._t09_pending_right = null;
  }

  parse() {
    if (!this.data || this.data.length < 5) return '';
    this.pos = 0;
    this.output = [];
    this.fontDefs = [];
    this._t09_pending_right = null;

    const ver = this.data[this.pos++];
    const plat = this.data[this.pos++];
    const prod = this.data[this.pos++];
    const mtype = this.data[this.pos++];
    
    this._skipEquipment();
    this._parseEquation(true);
    let latex = this.output.join('').trim();
    latex = latex.replace(/\s+/g, ' ')
                 .replace(/\\left\.\s*/g, '')
                 .replace(/\s*\\right\./g, '')
                 .replace(/(\\right[\)\}\]\|\>])\s*([_\^])/g, '$1$2')
                 .replace(/\+\s*\-/g, '-')
                 .replace(/\\,\s*\\,/g, '\\,')
                 .replace(/\[(?:00)?[Aa]0\]/g, ' ')
                 .replace(/\[EF[0-9A-Fa-f]{2}\]/g, '\\,')
                 .replace(/\u00a0/g, ' ')
                 .replace(/(\d+),\s+(\d+)/g, '$1,$2');
    return latex;
  }

  _skipEquipment() {
    while (this.pos < this.data.length) {
      const tag = this.data[this.pos];
      if (tag === 0x01) {
        this._skipString();
      } else if (tag === 0x08) {
        this._skipEqnPrefs();
      } else if (tag === 0x11) {
        this._parseFontDef();
      } else if (tag === 0x12) {
        this.pos += 2;
      } else if (tag === 0x13) {
        this._parseEncodingDef();
      } else if (tag === 0x10) {
        this.pos += 1;
        this._parseColorDef();
      } else if ([0x02, 0x03, 0x0A, 0x0B, 0x0C, 0x0F].includes(tag)) {
        break;
      } else {
        this.pos++;
      }
    }
  }

  _skipString() {
    this.pos++;
    while (this.pos < this.data.length && this.data[this.pos] !== 0x00) this.pos++;
    if (this.pos < this.data.length) this.pos++;
  }

  _skipEqnPrefs() {
    this.pos++;
    for (let i = this.pos; i < this.data.length - 1; i++) {
      if (this.data[i] === 0x0F && this.data[i+1] === 0x0C) {
        this.pos = i + 2;
        let start = this.pos;
        while (this.pos < this.data.length - 1) {
          if (this.data[this.pos] === 0x00 && this.data[this.pos+1] === 0x00) {
            this.pos += 2;
            break;
          }
          this.pos++;
          if (this.pos - start > 30) break;
        }
        return;
      }
    }
    this.pos = Math.min(this.pos + 100, this.data.length);
  }

  _parseFontDef() {
    this.pos++; // tag 0x11
    if (this.pos >= this.data.length) return;
    const fontIdx = this.data[this.pos++];
    let name = '';
    while (this.pos < this.data.length && this.data[this.pos] !== 0x00) {
      name += String.fromCharCode(this.data[this.pos++]);
    }
    if (this.pos < this.data.length) this.pos++;
    this.fontDefs[fontIdx] = name;
  }

  _parseEncodingDef() {
    this.pos++; // tag 0x13
    let name = '';
    while (this.pos < this.data.length && this.data[this.pos] !== 0x00) {
      name += String.fromCharCode(this.data[this.pos++]);
    }
    if (this.pos < this.data.length) this.pos++;
  }

  _parseColorDef() {
    if (this.pos >= this.data.length) return;
    this.pos++;
    while (this.pos < this.data.length && this.data[this.pos] !== 0x00) this.pos++;
    if (this.pos < this.data.length) this.pos++;
  }

  _skipNudge() {
    if (this.pos >= this.data.length) return;
    const dx = this.data[this.pos++];
    if (dx === 128) this.pos += 2;
    if (this.pos >= this.data.length) return;
    const dy = this.data[this.pos++];
    if (dy === 128) this.pos += 2;
  }

  _parseEquation(topLevel = false) {
    while (this.pos < this.data.length) {
      const tag = this.data[this.pos];
      if (tag === 0x00) {
        this.pos++;
        if (!topLevel) break;
        continue;
      }
      this._parseRecord(tag);
    }
  }

  _parseRecord(tag) {
    if (tag === 0x01) {
      this._parseLine();
    } else if (tag === 0x02) {
      this._parseChar();
    } else if (tag === 0x03) {
      this._parseTemplate();
    } else if (tag === 0x04) {
      this._parsePile();
    } else if (tag === 0x05) {
      this._parseMatrix();
    } else if (tag === 0x06) {
      this._parseEmbellishment();
    } else if (tag === 0x08) {
      this.pos++;
      if (this.pos < this.data.length) {
        this.pos++; // skip font_def_index
        while (this.pos < this.data.length && this.data[this.pos] !== 0x00) this.pos++;
        if (this.pos < this.data.length) this.pos++;
      }
    } else if (tag === 0x09) {
      this.pos += 6;
    } else if ([0x0A, 0x0B, 0x0C, 0x0D].includes(tag)) {
      this.pos++;
    } else if (tag === 0x0F) {
      this.pos += 2;
    } else if (tag === 0x10) {
      this.pos++;
      this._parseColorDef();
    } else if (tag === 0x11) {
      this._parseFontDef();
    } else if (tag === 0x13) {
      this._parseEncodingDef();
    } else if (tag === 0xB0) {
      this.pos++;
      this.output.push(' ');
    } else {
      this.pos++;
    }
  }

  _parseLine() {
    this.pos++; // skip 0x01
    if (this.pos >= this.data.length) return;
    const options = this.data[this.pos++];
    if (options & 0x08) this._skipNudge();
    if (options & 0x04) {
      while (this.pos < this.data.length && this.data[this.pos] !== 0x00) this.pos++;
      if (this.pos < this.data.length) this.pos++;
    }
    if (options & 0x02) {
      if (this.pos < this.data.length && this.data[this.pos] === 0x07) {
        this.pos++;
        if (this.pos < this.data.length) {
          const n = this.data[this.pos++];
          this.pos += n * 3;
        }
      }
    }
  }

  _parseChar() {
    this.pos++; // skip 0x02
    if (this.pos >= this.data.length) return;
    const charType = this.data[this.pos++];
    if (charType & 0x08) this._skipNudge();
    let fontIdx = 0;
    if (this.pos < this.data.length) fontIdx = this.data[this.pos++];
    
    let charCode = 0;
    if (this.pos < this.data.length) {
      const charLo = this.data[this.pos++];
      const charHi = this.pos < this.data.length ? this.data[this.pos++] : 0;
      charCode = (charHi << 8) | charLo;
    }
    let fallback = 0;
    if (charType & 0x04) {
      fallback = this.pos < this.data.length ? this.data[this.pos++] : 0;
    }

    // Suppress decorative fence characters ( ) [ ] { }
    const fontName = (this.fontDefs[fontIdx] || '').toLowerCase();
    const isEuclid = fontName.includes('euclid');
    if ([0x28, 0x29, 0x5B, 0x5D, 0x7B, 0x7D].includes(charCode) && (isEuclid || fontIdx === 150 || fontIdx >= 148)) {
      if (charType & 0x01) {
        while (this.pos < this.data.length) {
          const tag = this.data[this.pos];
          if (tag === 0x00) { this.pos++; break; }
          else if (tag === 0x06) { this._parseEmbellishment(); }
          else break;
        }
      }
      return;
    }

    let latex = this._charToLatex(charCode, fontIdx, fallback);
    if (latex) {
      if (latex.startsWith('\\') && /[a-zA-Z]$/.test(latex)) latex += ' ';
      this.output.push(latex);
    }

    if (charType & 0x01) {
      while (this.pos < this.data.length) {
        const tag = this.data[this.pos];
        if (tag === 0x00) { this.pos++; break; }
        else if (tag === 0x06) { this._parseEmbellishment(); }
        else break;
      }
    }
  }

  _charToLatex(code, fontIdx, fallback) {
    if ([0x00A0, 0xA0, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0xEF08].includes(code)) {
      return ' ';
    }
    if ([0x200B, 0x2060, 0xFEFF, 0xEF01, 0xEF02, 0xEF04].includes(code)) {
      return '';
    }
    const fontName = (this.fontDefs[fontIdx] || '').toLowerCase();
    const isSymbolFont = fontIdx === 3 || fontName.includes('symbol') || fontName.includes('mtextra');

    if (MTEF_UNICODE_MAP[code]) return MTEF_UNICODE_MAP[code];

    if (!isSymbolFont && code >= 0x20 && code <= 0x7E) {
      const ch = String.fromCharCode(code);
      if (/[a-zA-Z0-9]/.test(ch)) return ch;
      if (ch === ' ') return ' ';
      if (ch === '=') return ' = ';
      if (ch === '<') return ' < ';
      if (ch === '>') return ' > ';
      if (ch === '+') return ' + ';
      if (ch === '-') return ' - ';
      if (ch === '/') return '/';
      if (ch === ':') return ':';
      if (ch === ';') return '; ';
      if (ch === ',') return ', ';
      if (ch === '(') return '(';
      if (ch === ')') return ')';
      if (ch === '[') return '[';
      if (ch === ']') return ']';
      if (ch === '{') return '\{';
      if (ch === '}') return '\}';
      if (ch === '|') return '\mid ';
      return ch;
    }

    if (MTEF_SYMBOL_MAP[code]) return MTEF_SYMBOL_MAP[code];
    if (MTEF_MTEXTRA_MAP[code]) return MTEF_MTEXTRA_MAP[code];

    if (code >= 0x20 && code <= 0x7E) {
      const ch = String.fromCharCode(code);
      if (/[a-zA-Z0-9]/.test(ch)) return ch;
      if (ch === ' ') return ' ';
      if (ch === '=') return ' = ';
      if (ch === '<') return ' < ';
      if (ch === '>') return ' > ';
      if (ch === '+') return ' + ';
      if (ch === '-') return ' - ';
      if (ch === '/') return '/';
      if (ch === ':') return ':';
      if (ch === ';') return '; ';
      if (ch === ',') return ', ';
      if (ch === '(') return '(';
      if (ch === ')') return ')';
      if (ch === '[') return '[';
      if (ch === ']') return ']';
      if (ch === '{') return '\\{';
      if (ch === '}') return '\\}';
      if (ch === '|') return '\\mid ';
      return ch;
    }
    if (fallback && MTEF_UNICODE_MAP[fallback]) return MTEF_UNICODE_MAP[fallback];
    return '';
  }

  _parseTemplate() {
    this.pos++; // skip 0x03
    if (this.pos >= this.data.length) return;
    const options = this.data[this.pos++];
    if (options & 0x08) this._skipNudge();
    if (this.pos >= this.data.length) return;
    const selector = this.data[this.pos++];
    if (this.pos >= this.data.length) return;
    const variation = this.data[this.pos++];
    const tplType = (selector === 0x00) ? variation : selector;
    let tplOpt = 0;
    if ([0x01, 0x02, 0x03, 0x04, 0x06, 0x07, 0x0A, 0x0B, 0x0C, 0x0F, 0x1A, 0x1B, 0x1C, 0x1D, 0x1F, 0x21].includes(tplType)) {
      if (this.pos < this.data.length) tplOpt = this.data[this.pos++];
    }

    let numSlots = 1;
    if (tplType === 0x0B) numSlots = 2; // fraction
    else if (tplType === 0x0C) numSlots = (variation === 0x01 ? 1 : 2);
    else if (tplType === 0x1D) numSlots = 2; // subsup
    else if (tplType === 0x0F) numSlots = (variation === 0x01 ? 2 : variation === 0x02 ? 3 : 4);

    const slots = [];
    for (let i = 0; i < numSlots; i++) {
      if (this.pos >= this.data.length) break;
      slots.push(this._parseInnerEquation());
    }
    if (this.pos < this.data.length && this.data[this.pos] === 0x00) this.pos++;

    this._renderTemplate(tplType, selector, variation, slots);
  }

  _parseInnerEquation() {
    const old = this.output;
    this.output = [];
    this._parseEquation(false);
    const res = this.output.join('');
    this.output = old;
    return res;
  }

  _renderTemplate(tplType, selector, variation, slots) {
    const s0 = (slots[0] || '').trim();
    const s1 = (slots[1] || '').trim();
    if (tplType === 0x01) { // paren ()
      this.output.push('\\left( ' + s0 + ' \\right)');
    } else if (tplType === 0x02) { // brace {}
      this.output.push('\\left\\{ ' + s0 + ' \\right\\}');
    } else if (tplType === 0x03) { // bracket []
      this.output.push('\\left[ ' + s0 + ' \\right]');
    } else if (tplType === 0x04) { // bar ||
      this.output.push('\\left| ' + s0 + ' \\right|');
    } else if (tplType === 0x0B) { // fraction
      this.output.push('\\dfrac{' + s0 + '}{' + s1 + '}');
    } else if (tplType === 0x0A) { // sqrt
      this.output.push('\\sqrt{' + s0 + '}');
    } else if (tplType === 0x0C) { // nth root
      if (slots.length >= 2) this.output.push('\\sqrt[' + s0 + ']{' + s1 + '}');
      else this.output.push('\\sqrt{' + s0 + '}');
    } else if (tplType === 0x1B) { // sub
      const prev = (this.output.pop() || '').trim();
      this.output.push(prev + '_{' + s0 + '}');
    } else if (tplType === 0x1C) { // sup
      const prev = (this.output.pop() || '').trim();
      this.output.push(prev + '^{' + s0 + '}');
    } else if (tplType === 0x1D) { // subsup
      const prev = (this.output.pop() || '').trim();
      this.output.push(prev + '_{' + s0 + '}^{' + s1 + '}');
    } else if (tplType === 0x1F) { // vector
      this.output.push('\\overrightarrow{' + s0 + '}');
    } else if (tplType === 0x07) { // overbar
      this.output.push('\\overline{' + s0 + '}');
    } else if (tplType === 0x06) { // underbar
      this.output.push('\\underline{' + s0 + '}');
    } else if (tplType === 0x0F) { // integral / sum
      if (slots.length >= 4) {
        this.output.push(slots[3] + '_{' + slots[1] + '}^{' + slots[2] + '} ' + slots[0]);
      } else {
        this.output.push(slots.join(''));
      }
    } else if (tplType === 0x09) { // interval
      const LEFT = {1: '[', 4: '(', 5: '\\{', 7: '|', 0: '.'};
      const RIGHT = {2: ')', 3: ']', 6: '\\}', 7: '|', 0: '.'};
      const l = LEFT[(variation >> 4) & 0x0F] || '[';
      const r = RIGHT[variation & 0x0F] || ')';
      this.output.push('\\left' + l + ' ' + s0 + ' \\right' + r);
    } else {
      this.output.push(slots.join(''));
    }
  }

  _parsePile() {
    this.pos++; // skip tag
    if (this.pos >= this.data.length) return;
    const options = this.data[this.pos++];
    if (options & 0x08) this._skipNudge();
    this.pos += 2; // halign & valign
  }

  _parseMatrix() {
    if (this.pos + 5 > this.data.length) { this.pos = this.data.length; return; }
    this.pos += 3; // valign, hjust, vjust
    const rows = this.data[this.pos++];
    const cols = this.data[this.pos++];
    this.pos += (rows + 1) + (cols + 1);
    const cells = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(this._parseInnerEquation().trim());
      }
      cells.push(row.join(' & '));
    }
    if (this.pos < this.data.length && this.data[this.pos] === 0x00) this.pos++;
    this.output.push('\\begin{matrix}' + cells.join('\\\\') + '\\end{matrix}');
  }

  _parseEmbellishment() {
    this.pos++; // skip tag
    if (this.pos >= this.data.length) return;
    const options = this.data[this.pos++];
    if (options & 0x08) this._skipNudge();
    if (this.pos >= this.data.length) return;
    const embell = this.data[this.pos++];
    const prev = this.output.pop() || '';
    if (embell === 0x01) this.output.push('\\dot{' + prev + '}');
    else if (embell === 0x02) this.output.push('\\ddot{' + prev + '}');
    else if (embell === 0x05) this.output.push(prev + "'");
    else if (embell === 0x06) this.output.push(prev + "''");
    else if (embell === 0x08) this.output.push('\\tilde{' + prev + '}');
    else if (embell === 0x09) this.output.push('\\hat{' + prev + '}');
    else if (embell === 0x0A) this.output.push('\\vec{' + prev + '}');
    else if (embell === 0x13) this.output.push('\\overline{' + prev + '}');
    else this.output.push(prev);
  }
}

function parseMtef(bytes) {
  const parser = new MtefParser(bytes);
  return parser.parse();
}

function extractMtefFromWmf(u8) {
  if (!u8 || u8.length < 40) return null;
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let offset = 0;
  if (dv.getUint32(0, true) === 0x9AC6CDD7) offset = 22;
  offset += 18; // standard header

  while (offset < u8.length - 6) {
    const recSize = dv.getUint32(offset, true) * 2;
    const recType = dv.getUint16(offset + 4, true);
    if (recType === 0x0626) { // ESCAPE record
      const payload = u8.subarray(offset + 6, offset + recSize);
      for (let i = 0; i < payload.length - 3; i++) {
        if (payload[i] === 0x05 && payload[i+1] === 0x01 && payload[i+2] === 0x00) {
          return payload.subarray(i);
        }
      }
    }
    if (recSize === 0) break;
    offset += recSize;
  }
  return null;
}



function wmfToSvg(buf) {
  if (!buf || buf.length < 40) return null;
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const mtef = extractMtefFromWmf(b);
  if (mtef) {
    try {
      const tex = parseMtef(mtef);
      if (tex && tex.trim()) {
        const safeTex = tex.trim();
        const escAttr = safeTex.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<span class="eq-tex" data-tex="${escAttr}">$${safeTex}$</span>`;
      }
    } catch (_) {}
  }

  let offset = 0;
  let minX = 0, minY = 0, maxX = 1000, maxY = 500;
  let hasApm = false;

  // Check Aldus Placeable Metafile header (magic: 0x9AC6CDD7)
  if (readU32(b, 0) === 0x9ac6cdd7) {
    hasApm = true;
    minX = readI16(b, 6);
    minY = readI16(b, 8);
    maxX = readI16(b, 10);
    maxY = readI16(b, 12);
    offset = 22;
  }
  // Standard WMF header (18 bytes)
  offset += 18;

  let winOrgX = 0, winOrgY = 0;
  let winExtX = maxX - minX, winExtY = maxY - minY;
  let curX = 0, curY = 0;
  let curColor = 'currentColor';
  let curFont = { face: 'Times New Roman', height: 384, italic: false, bold: false };
  let curPen = { color: 'currentColor', width: 14 };
  let curBrush = { color: 'currentColor' };
  let maxBaseline = 0;
  let baseFontHeight = 384;
  let texComment = '';
  const objects = {};
  const svgElements = [];
  const bracketPieces = [];

  while (offset < b.length) {
    if (offset + 6 > b.length) break;
    const recWords = readU32(b, offset);
    const recSize = recWords * 2;
    if (recSize < 6 || offset + recSize > b.length) break;
    const recFunc = readU16(b, offset + 4);
    if (recFunc === 0x0000) break; // EOF

    switch (recFunc) {
      case 0x0209: // SETTEXTCOLOR
        {
          const r = b[offset + 6], g = b[offset + 7], bl = b[offset + 8];
          curColor = (r === 0 && g === 0 && bl === 0) ? 'currentColor' : `rgb(${r},${g},${bl})`;
        }
        break;
      case 0x020b: // SETWINDOWORG
        winOrgY = readI16(b, offset + 6);
        winOrgX = readI16(b, offset + 8);
        break;
      case 0x020c: // SETWINDOWEXT
        winExtY = readI16(b, offset + 6);
        winExtX = readI16(b, offset + 8);
        break;
      case 0x0214: // MOVETO
        curY = readI16(b, offset + 6);
        curX = readI16(b, offset + 8);
        if (curY > maxBaseline) maxBaseline = curY;
        break;
      case 0x0213: // LINETO
        {
          const toY = readI16(b, offset + 6);
          const toX = readI16(b, offset + 8);
          svgElements.push(`<line x1="${curX}" y1="${curY}" x2="${toX}" y2="${toY}" stroke="${curPen.color}" stroke-width="${Math.max(14, curPen.width)}" stroke-linecap="round"/>`);
          curX = toX; curY = toY;
          if (curY > maxBaseline) maxBaseline = curY;
        }
        break;
      case 0x0325: // POLYLINE
        {
          const count = readI16(b, offset + 6);
          const pts = [];
          for (let i = 0; i < count; i++) {
            const px = readI16(b, offset + 8 + i * 4);
            const py = readI16(b, offset + 10 + i * 4);
            pts.push(`${px},${py}`);
            if (py > maxBaseline) maxBaseline = py;
          }
          svgElements.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${curPen.color}" stroke-width="${Math.max(14, curPen.width)}" stroke-linecap="round" stroke-linejoin="round"/>`);
        }
        break;
      case 0x0324: // POLYGON
        {
          const count = readI16(b, offset + 6);
          const pts = [];
          for (let i = 0; i < count; i++) {
            const px = readI16(b, offset + 8 + i * 4);
            const py = readI16(b, offset + 10 + i * 4);
            pts.push(`${px},${py}`);
            if (py > maxBaseline) maxBaseline = py;
          }
          svgElements.push(`<polygon points="${pts.join(' ')}" fill="${curBrush.color}" stroke="${curPen.color}" stroke-width="${curPen.width}"/>`);
        }
        break;
      case 0x041b: // RECTANGLE
        {
          const btm = readI16(b, offset + 6), rgt = readI16(b, offset + 8);
          const top = readI16(b, offset + 10), lft = readI16(b, offset + 12);
          svgElements.push(`<rect x="${lft}" y="${top}" width="${rgt - lft}" height="${btm - top}" fill="${curBrush.color}"/>`);
        }
        break;
      case 0x02fb: // CREATEFONTINDIRECT
        {
          const height = Math.abs(readI16(b, offset + 6));
          /* LOGFONT16: Height@6 Width@8 Escapement@10 Orientation@12 Weight@14 Italic@16 Underline@17 StrikeOut@18 CharSet@19 FaceName@24 */
          const weight = readI16(b, offset + 14);
          const italic = b[offset + 16] !== 0;
          const charset = b[offset + 19];
          let faceEnd = Math.min(offset + 56, offset + recSize);
          let face = '';
          for (let i = offset + 24; i < faceEnd; i++) {
            if (b[i] === 0) break;
            face += String.fromCharCode(b[i]);
          }
          face = face.trim();
          let slot = 0;
          while (objects[slot] !== undefined) slot++;
          objects[slot] = { type: 'font', height: height || 384, weight, italic, face, charset };
          if (height > baseFontHeight) baseFontHeight = height;
        }
        break;
      case 0x02fa: // CREATEPENINDIRECT
        {
          const style = readU16(b, offset + 6);
          const width = readI16(b, offset + 8);
          const blue = b[offset + 12], green = b[offset + 13], red = b[offset + 14];
          let slot = 0;
          while (objects[slot] !== undefined) slot++;
          const isDark = (red === 0 && green === 0 && blue === 0);
          objects[slot] = { type: 'pen', style, width: Math.max(14, width), color: isDark ? 'currentColor' : `rgb(${red},${green},${blue})` };
        }
        break;
      case 0x02fc: // CREATEBRUSHINDIRECT
        {
          const style = readU16(b, offset + 6);
          const blue = b[offset + 8], green = b[offset + 9], red = b[offset + 10];
          let slot = 0;
          while (objects[slot] !== undefined) slot++;
          const isDark = (red === 0 && green === 0 && blue === 0);
          objects[slot] = { type: 'brush', style, color: isDark ? 'currentColor' : `rgb(${red},${green},${blue})` };
        }
        break;
      case 0x012d: // SELECTOBJECT
        {
          const idx = readU16(b, offset + 6);
          const obj = objects[idx];
          if (obj) {
            if (obj.type === 'font') curFont = obj;
            else if (obj.type === 'pen') curPen = obj;
            else if (obj.type === 'brush') curBrush = obj;
          }
        }
        break;
      case 0x01f0: // DELETEOBJECT
        {
          const idx = readU16(b, offset + 6);
          delete objects[idx];
        }
        break;
      case 0x0a32: // EXTTEXTOUT
        {
          const y = readI16(b, offset + 6);
          const x = readI16(b, offset + 8);
          const strLen = readI16(b, offset + 10);
          const fuOptions = readU16(b, offset + 12);
          let textOffset = offset + 14;
          if (fuOptions & 0x0006) textOffset += 8; // skip clipping rect
          let dxOffset = textOffset + strLen + (strLen % 2);

          const posX = (x === 0 && y === 0) ? curX : x;
          const posY = (y === 0 && x === 0) ? curY : y;
          if (posY > maxBaseline) maxBaseline = posY;

          const isSymbol = /symbol|mtextra/i.test(curFont.face);
          const hasDx = (dxOffset + strLen * 2 <= offset + recSize);

          const xs = [posX];
          for (let i = 0; i < strLen - 1; i++) {
            const dx = hasDx ? readI16(b, dxOffset + i * 2) : Math.round(curFont.height * 0.55);
            xs.push(xs[xs.length - 1] + dx);
          }

          const nonBracket = [];
          for (let i = 0; i < strLen; i++) {
            const code = b[textOffset + i];
            if (BRACKET_CODES.has(code)) {
              bracketPieces.push({
                code,
                x: xs[i],
                y: posY,
                fontHeight: curFont.height,
                color: curColor
              });
            } else {
              nonBracket.push(i);
            }
          }

          if (nonBracket.length > 0) {
            const subXs = nonBracket.map(i => xs[i]);
            let textContent = '';
            for (const i of nonBracket) {
              const code = b[textOffset + i];
              const ch = (isSymbol && SYMBOL_MAP[code]) ? SYMBOL_MAP[code] : charsetChar(code, curFont.charset);
              textContent += ch;
            }
            const escaped = textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const fontFace = isSymbol ? 'Cambria Math, "Times New Roman", serif' : `"${curFont.face}", "Times New Roman", serif`;
            const fontStyle = curFont.italic ? 'font-style:italic;' : '';
            const fontWeight = curFont.weight >= 700 ? 'font-weight:bold;' : '';
            svgElements.push(`<text x="${subXs.join(' ')}" y="${posY}" font-family='${fontFace}' font-size="${curFont.height}" fill="${curColor}" ${fontStyle?'style="'+fontStyle+'" ':''}${fontWeight?'font-weight="bold" ':''}>${escaped}</text>`);
          }

          if (hasDx) {
            let totalDx = 0;
            for (let i = 0; i < strLen; i++) totalDx += readI16(b, dxOffset + i * 2);
            curX = posX + totalDx;
          }
        }
        break;
      case 0x0626: // ESCAPE comment: extract TeX if MathType embedded it
        {
          const payload = b.subarray(offset + 6, offset + recSize);
          const str = String.fromCharCode.apply(null, payload);
          const texIdx = str.indexOf('TeX Input Language\0');
          if (texIdx !== -1) {
            const start = texIdx + 19;
            const end = str.indexOf('\0', start);
            if (end !== -1) {
              texComment = str.slice(start, end).trim()
                .replace(/\[(?:00)?[Aa]0\]/g, ' ')
                .replace(/\[EF[0-9A-Fa-f]{2}\]/g, '\\,')
                .replace(/\u00a0/g, ' ')
                .replace(/(\d+),\s+(\d+)/g, '$1,$2');
            }
          }
        }
        break;
    }
    offset += recSize;
  }

  assembleBrackets(bracketPieces, svgElements);

  const width = winExtX || (maxX - minX) || 1000;
  const height = winExtY || (maxY - minY) || 500;
  const viewBox = `${winOrgX} ${winOrgY} ${width} ${height}`;

  // CSS height in em relative to font size (~384 units for 1em)
  const refFont = baseFontHeight || 384;
  const heightEm = (height / refFont).toFixed(3);
  const baseline = maxBaseline || Math.round(height * 0.75);
  const vAlign = -( (height - baseline) / refFont ).toFixed(3);

  const titleAttr = texComment ? ` title="${texComment.replace(/"/g, '&quot;')}"` : '';
  const ariaAttr = texComment ? ` aria-label="${texComment.replace(/"/g, '&quot;')}"` : ' aria-label="Công thức MathType"';

  return `<svg class="eq-mathtype" viewBox="${viewBox}" style="height:${heightEm}em;width:auto;vertical-align:${vAlign}em;display:inline-block;overflow:visible;" role="math"${titleAttr}${ariaAttr}>${svgElements.join('')}</svg>`;
}

/* Chữ trong WMF là byte theo bảng mã của font: MathType ghi Δ, α… bằng font Greek (charset 161) → phải đọc theo windows-1253, không phải Latin (Δ thành "Ä") */
const CHARSET_CODEPAGE = { 161: 'windows-1253', 162: 'windows-1254', 163: 'windows-1258', 177: 'windows-1255', 178: 'windows-1256', 186: 'windows-1257', 204: 'windows-1251', 222: 'windows-874', 238: 'windows-1250' };
const charsetDecoders = {};
function charsetChar(code, charset) {
  const cp = code >= 0x80 && CHARSET_CODEPAGE[charset];
  if (!cp || typeof TextDecoder !== 'function') return String.fromCharCode(code);
  try { return (charsetDecoders[cp] ||= new TextDecoder(cp)).decode(Uint8Array.of(code)); } catch (e) { return String.fromCharCode(code); }
}

const api = { toSvg: wmfToSvg, parseMtef, extractMtefFromWmf, symbolChar: code => SYMBOL_MAP[code] || String.fromCharCode(code) };
if (typeof window !== 'undefined') window.NBWmf = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
