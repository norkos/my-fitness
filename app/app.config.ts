export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      neutral: 'neutral',
    },
    // Controls are 7px (rounded-md from --ui-radius), cards 10px; touch targets are 44px on phones.
    button: {
      slots: {
        base: 'rounded-md min-h-11 nav:min-h-9',
      },
    },
    card: {
      slots: {
        root: 'rounded-[10px] bg-white',
      },
    },
  },
})
