function generateRandom() {
  return crypto.randomUUID();
}

function elementWithText(text, tag = "div") {
  const el = document.createElement(tag);
  el.style.display = "block";
  el.textContent = text;
  return el;
}

module.exports = { generateRandom, elementWithText };
