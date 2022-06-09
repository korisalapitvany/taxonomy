// DOM helpers.
// These are mostly to facilitate better minification.

// Wrapper for element.querySelector.
function querySelector(el: HTMLElement, selector: string): HTMLElement {
  return el.querySelector(selector);
}

// Wrapper for document.createElement.
function createElement(tag: string, classList: Array<string>): HTMLElement {
  const el: HTMLElement = document.createElement(tag);
  addClasses(el, classList);
  return el;
}

// Wrapper for document.createElement + element.append.
function createChild(parent: HTMLElement, tag: string, classList: Array<string>): HTMLElement {
  const el: HTMLElement = createElement(tag, classList);
  append(parent, [el]);
  return el;
}

// Wrapper for element.append.
function append(parent: HTMLElement, children: Array<HTMLElement>): void {
  children.forEach((child: HTMLElement): void => { parent.append(child) });
}

// Wrapper for element.classList.add.
function addClass(el: HTMLElement, className: string): void {
  addClasses(el, [className]);
}

// Wrapper for mapping [] to element.classList.add.
function addClasses(el: HTMLElement, classNames: Array<string>): void {
  classNames.forEach((c: string): void => el.classList.add(c));
}

// Wrapper for setting dataset properties.
function setData(el: HTMLElement, key: string, value: string): void {
  el.dataset[key] = value;
}
