/**
 * MFD LZW Compression Utility
 *
 * LZW string compression/decompression with base64 support.
 * Used for save game data compression.
 */

export var LZW = {
  compress: function (s) {
    if (!s) return "";
    var dict = {}, data = (s + "").split(""), out = [], phrase = data[0], code = 256;
    for (var i = 1; i < data.length; i++) {
      var c = data[i];
      if (dict[phrase + c] != null) { phrase += c; }
      else { out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0)); dict[phrase + c] = code++; phrase = c; }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    var result = [];
    for (var j = 0; j < out.length; j++) { result.push(String.fromCharCode(out[j] & 0xFFFF)); }
    return result.join("");
  },
  decompress: function (s) {
    if (!s) return "";
    var dict = {}, data = (s + "").split(""), currChar = data[0], oldPhrase = currChar, out = [currChar], code = 256, phrase;
    for (var i = 1; i < data.length; i++) {
      var currCode = data[i].charCodeAt(0);
      phrase = currCode < 256 ? data[i] : (dict[currCode] ? dict[currCode] : (oldPhrase + currChar));
      out.push(phrase);
      currChar = phrase.charAt(0);
      dict[code++] = oldPhrase + currChar;
      oldPhrase = phrase;
    }
    return out.join("");
  },
  compressToBase64: function (s) { try { return btoa(unescape(encodeURIComponent(LZW.compress(s)))); } catch (e) { return btoa(LZW.compress(s)); } },
  decompressFromBase64: function (b) { try { return LZW.decompress(decodeURIComponent(escape(atob(b)))); } catch (e) { return LZW.decompress(atob(b)); } }
};
