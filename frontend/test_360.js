const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3001/services/kalai_arangam/class');
  
  // wait for the page to load
  await page.waitForSelector('button');
  
  // find the rentals tab and click it
  const tabs = await page.$$('button');
  let clicked = false;
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text.includes('Rentals')) {
      await tab.click();
      clicked = true;
      break;
    }
  }
  
  if (!clicked) {
    console.log("Rentals tab not found");
  } else {
    console.log("Clicked Rentals tab");
    await new Promise(r => setTimeout(r, 1000)); // wait for transition
  }
  
  // find 360 buttons
  const buttons = await page.$$('button[title="360° View"]');
  console.log("Found 360 view buttons:", buttons.length);
  
  if (buttons.length > 0) {
    // try to hover the first card
    const cards = await page.$$('.group');
    if (cards.length > 0) {
      await cards[0].hover();
      console.log("Hovered the first card");
      await new Promise(r => setTimeout(r, 500));
      
      const isVisible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.opacity > 0 && style.visibility !== 'hidden';
      }, buttons[0]);
      
      console.log("Button visible after hover?", isVisible);
      
      await buttons[0].evaluate(b => b.click());
      console.log("Clicked the button");
      
      await new Promise(r => setTimeout(r, 500));
      const html = await page.evaluate(() => document.body.innerHTML);
      console.log("Does modal text exist?", html.includes("Interactive 360° View"));
    }
  }

  await browser.close();
})();
