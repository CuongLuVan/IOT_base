/**
 * Store a value for the current browser session. Access tokens must not
 * survive a closed browser and therefore must not be kept in localStorage.
 *
 * @param {string} key
 * @param {string | array | object} value
 */
export let setLocalStorage = (key, value) => {
  if (value && typeof value === 'string') {
    sessionStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, JSON.stringify(value)); // convert arrays or objects into strings
  }
};

/**
 * Retrieve record from the storage using the key
 *
 * @param {string} key
 */
export let getLocalStorage = (key) => {
  // Remove any access token written by older versions rather than silently
  // reusing a token that persists across browser sessions.
  localStorage.removeItem(key);
  const data = sessionStorage.getItem(key);
  try {
    return JSON.parse(data); // converts a JSON string into a Javascript Object
  } catch (e) {
    return data;
  }
};

/**
 * Clear records from the storage using the key
 *
 * @param {string} key
 */
export let clearLocalStorage = (key) => {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};
