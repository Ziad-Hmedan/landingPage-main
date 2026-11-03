/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    fontSize: {
      xss: ".625rem", //10

      xs: ".8125rem", //13

      smm: ".875rem", //14
      sm: ".9375rem", //15

      base: "1rem", //16

      md: "1.875rem", //30
      lg: "2.5rem", //40
      xl: "3.5rem", //56
    },
    lineHeight: {
      xss: "26px", 
      xs: "28px", 

      base: "auto", 

      lg: "44px", 
      lg1: "45px", 

      xl: "50px", 
      xl1: "64px",
    },
    letterSpacing:{
        sm:"-1px",
        md:"-.7px",
        xl:"-.1px",
    },
    fontFamily:{
      vietnam: ["Be Vietnam Pro", "sans-serif"],
    },
    screens:{
      xss:"300px",
      xs:"327px",
      sm:" 540px",
      md:" 790px",
      lg:" 960px",
      xl:" 1110px",
    },
    container:{
      center:true,
    },
    extend: {
      colors: {
        BrightRed: "#f3603c",
        BrightRedLight:"#F98F75",
        DarkBlue: "#242d52",

        white: "#ffffff",
        "almost-white": "#fafafa",

        black: "#000000",
        gray: {
          
          light: "#e5e9ea",
          med: "#8d8d8d",
          dark: "#343a40",
        },

        softPink: "#fcf6f5",
        PaleRed: "#fff0ec",

        dark: "#1d1e25",
        midnight: "#1e272e",
      },
    },
  },
  plugins: [],
};
