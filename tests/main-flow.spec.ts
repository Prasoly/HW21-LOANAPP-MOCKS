import { test, expect, Route } from '@playwright/test';

const serviceURL = 'http://localhost:3000';
const backendURL = 'http://localhost:8080';

test('main flow', async ({ page }) => {
    await page.goto(serviceURL);

    await page.getByTestId('id-small-loan-calculator-field-apply').click();
    await page.getByTestId('login-popup-username-input').fill('usern');
    await page.getByTestId('login-popup-password-input').fill('pwd');
    await page.getByTestId('login-popup-continue-button').click();

    await page.getByTestId('final-page-continue-button').click();
    await page.getByTestId('final-page-success-ok-button').click();
});

test('redirect flow', async ({ page }) => {
    await page.goto(serviceURL);

    await page.getByTestId('id-image-element-button-image-1').click();
    await expect(
        page.getByTestId('id-small-loan-calculator-field-apply')
    ).toBeInViewport();

    await page.getByTestId('id-image-element-button-image-2').click();
    await expect(
        page.getByTestId('id-small-loan-calculator-field-apply')
    ).toBeInViewport();
});

test('1.0 - (mock) loan calculation', async ({ page }) => {
    const data = {
        default: '42.8',
        changed: '50',
    };

    await page.route('**/api/loan-calc?amount=500**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            json: { paymentAmountMonthly: data.default },
        });
    });

    await page.route('**/api/loan-calc?amount=1000**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            json: { paymentAmountMonthly: data.changed },
        });
    });

    const calculationSpan = page.getByTestId(
        'ib-small-loan-calculator-field-monthlyPayment'
    );
    const amountInput = page.getByTestId(
        'id-small-loan-calculator-field-amount'
    );

    await page.goto(serviceURL);
    await page.waitForResponse(`${backendURL}/api/loan-calc*`);

    expect((await calculationSpan.innerText()).split(' ')[0]).toBe(
        data.default
    );

    await amountInput.fill('1000');
    await page.waitForResponse(`${backendURL}/api/loan-calc*`);

    expect(await amountInput.inputValue()).toBe('1000');
    expect((await calculationSpan.innerText()).split(' ')[0]).toBe(
        data.changed
    );
});

test('1.1 - (mock) negative loan calculation test', async ({ page }) => {
    await page.route('**/api/loan-calc*', async (route: Route) => {
        await route.fulfill({ status: 400 });
    });

    await page.goto(serviceURL);
    await page.waitForResponse(`${backendURL}/api/loan-calc*`);

    await expect(
        page.getByTestId('id-small-loan-calculator-field-error')
    ).toBeVisible();
});

test('1.2 - (mock) loan calculation with status 500 and no response body', async ({
                                                                                      page,
                                                                                  }) => {
    await page.route('**/api/loan-calc?amount=500**', async (route: Route) => {
        await route.fulfill({ status: 500 });
    });

    await page.goto(serviceURL);
    await page.waitForResponse(`${backendURL}/api/loan-calc*`);

    await expect(
        page.getByTestId('id-small-loan-calculator-field-error')
    ).toBeVisible();
});

test('1.3 - (mock) loan calculation with status 200 and no response body', async ({
                                                                                      page,
                                                                                  }) => {
    await page.route('**/api/loan-calc?amount=500**', async (route: Route) => {
        await route.fulfill({ status: 200 });
    });

    await page.goto(serviceURL);
    await page.waitForResponse(`${backendURL}/api/loan-calc*`);

    await expect(
        page.getByTestId('ib-small-loan-calculator-field-monthlyPayment')
    ).toContainText('undefined');
});

test('1.4 - (mock) loan calculation with wrong response body key', async ({
                                                                              page,
                                                                          }) => {
    await page.route('**/api/loan-calc?amount=500**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            json: { helloThere: '1.11' },
        });
    });

    await page.goto(serviceURL);
    await page.waitForResponse(`${backendURL}/api/loan-calc*`);

    await expect(
        page.getByTestId('ib-small-loan-calculator-field-monthlyPayment')
    ).toContainText('undefined');
});
