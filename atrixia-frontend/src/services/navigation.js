let navigateFn = null;

export const setNavigate = (navFn) => {
  navigateFn = navFn;
};

export const navigateTo = (path) => {
  if (navigateFn) {
    navigateFn(path);
  } else {
    console.error('Navigation function not set');
  }
};