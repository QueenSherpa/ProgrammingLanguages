//RgEx for homwork assignment 

//the following is a series of Regular Expressions determining the acceptable patterns for inputs in the calorie count app
//the regular expressions will be used for the username, password, food, calories, date, and color inputs 

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PATTERNS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const PATTERNS = {
        username: /^[A-Za-z0-9_]{3,32}$/ , //3-32 chars, no spaces, must have at leas one letter and one number, underscores allowed
        password: /^(?=.*[A-Za-z])(?=.*\d)\S{8,128}$/, //another RegEx for the password defieing that it must start with a letter or number, no spaces and common puncuations, 8-128 cahracters 
        food: /^[\p{L}\p{N}][\p{L}\p{N} .,'&()%\/-]{0,119}$/u, //must start with a letter or number withing 120 characters
        calories: /^(0|[1-9]\d{0,4})$/,         //whiole numbers only allowed for this input, no leading zeros allowed
        date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
        hexColor: /^#[0-9a-fA-F]{6}$/,
  };

  const MESSAGES = {
    username: 'Username must be 3-32 letters, numbers or underscores',
    password: 'Password must be 8-128 characters with at least one letter and at least one number, no spaces',
    food: 'Food must start with a letter or number',
    calories: 'Calories must be a whole number',
    date: 'Date must be YYYY-MM-DD',
    hexColor: 'Color must look like #1a2b3c',
  };

  function matches(name, value) {
    return typeof value === 'string' && PATTERNS[name].test(value);
  }

  return { PATTERNS, MESSAGES, matches };
});



