import { test, expect } from '@playwright/test';

const serviceURL = 'http://localhost:3000';
const backendURL = 'http://localhost:8080';

test('main flow', async ({ page }) => {
  await page.goto(serviceURL);
  await page.getByTestId('id-small-loan-calculator-field-apply').click();
  await page.getByTestId('login-popup-username-input').click();
  await page.getByTestId('login-popup-username-input').fill('usern');
  await page.getByTestId('login-popup-username-input').press('Tab');
  await page.getByTestId('login-popup-password-input').fill('pwd');
  await page.getByTestId('login-popup-continue-button').click();
  await page.getByTestId('final-page-continue-button').click();
  await page.getByTestId('final-page-success-ok-button').click();
});

test('redirect flow', async ({ page, request }) => {
  await page.goto(serviceURL);
  await page.getByTestId('id-image-element-button-image-1').click();
  await expect( page.getByTestId('id-small-loan-calculator-field-apply') ).toBeInViewport()
  await page.getByTestId('id-image-element-button-image-2').click();
  await expect( page.getByTestId('id-small-loan-calculator-field-apply') ).toBeInViewport()
})

test('mocked loan calc', async ({ page }) => {
    await page.route(`**/api/loan-calc*`, async route => {
        // const url = route.request().url();
        // const newUrl = url.replace("1000", "1200");
        // await route.fetch({url: newUrl, method: "POST", postData: {test: "test"}});
        await route.fulfill({json: {"paymentAmountMonthly":144.33}, status: 200})
    });
    await page.route(`${backendURL}/api/loan-calc?amount=500&period=12`, async route => {
        await route.fulfill({json: {paymentAmountMonthly:200.33}})
    });

    const firstLoanCalcRequest = page.waitForResponse(`${backendURL}/api/loan-calc*`);
    await page.goto(serviceURL);
    await firstLoanCalcRequest;

    const secondLoanCalcRequest = page.waitForResponse(`${backendURL}/api/loan-calc*`);
    await page.getByTestId("id-small-loan-calculator-field-amount").fill("1000");
    await secondLoanCalcRequest;
    const calculationSpan = page.getByTestId("ib-small-loan-calculator-field-monthlyPayment");
    expect(await calculationSpan.innerText()).not.toHaveLength(0);
})

test("negative test (400 status code)", async ({page}) => {
    await page.route(`**/api/loan-calc*`, async route => {
        await route.fulfill({
            status: 400
        });
    });

    const loanCalcResponse = page.waitForResponse(`**/api/loan-calc*`);
    await page.goto(serviceURL);
    await loanCalcResponse;

    const errorSpan = page.getByTestId("id-small-loan-calculator-field-error");
    await expect(errorSpan).toBeVisible();
})

