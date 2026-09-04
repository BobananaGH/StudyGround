// frontend/src/services/appEvents.js
export const APP_EVENTS = {
  COURSES_CHANGED: "studyground:courses-changed",
  CONVERSATIONS_CHANGED: "studyground:conversations-changed",
};

export function emitAppEvent(eventName) {
  window.dispatchEvent(new Event(eventName));
}

export function subscribeAppEvent(eventName, handler) {
  window.addEventListener(eventName, handler);

  return () => {
    window.removeEventListener(eventName, handler);
  };
}
