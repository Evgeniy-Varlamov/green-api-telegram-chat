// E2E-прогон сценариев в настоящем Chrome против mock GREEN-API (e2e/mock_api.py).
// Запуск: pnpm dev (или pnpm build && pnpm preview), python3 e2e/mock_api.py,
// затем APP=http://localhost:5173/ node --experimental-websocket e2e/run.mjs [папка для скриншота]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const APP = process.env.APP ?? 'http://localhost:5173/'
const MOCK = 'http://127.0.0.1:8766'
const OUT = process.argv[2] ?? '.'
const PORT = 9334
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-e2e-'))}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      pending.set(n, (m) =>
        m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result),
      )
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description ?? 'eval error')
    return r.result.value
  }
  const waitFor = async (expression, what, timeout = 8000) => {
    const end = Date.now() + timeout
    while (Date.now() < end) {
      if (await evaluate(expression).catch(() => false)) return
      await sleep(150)
    }
    throw new Error(`не дождались: ${what}`)
  }
  await send('Page.enable')
  await send('Runtime.enable')
  return { ws, send, evaluate, waitFor }
}

async function newTab() {
  let list
  for (let i = 0; i < 50; i++) {
    try {
      list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      if (list.length) break
    } catch {}
    await sleep(200)
  }
  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?${APP}`, { method: 'PUT' })
  ).json()
  const tab = await connect(target.webSocketDebuggerUrl)
  tab.targetId = target.id
  return tab
}

// --- Помощники для DOM (выполняются в странице) ---
const js = {
  type: (selector, text) => `(() => {
    const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select?.();
    document.execCommand('insertText', false, ${JSON.stringify(text)}); return true })()`,
  click: (selector) =>
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.click(); return true })()`,
  clickText: (
    tag,
    text,
  ) => `(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})]
    .find(e => e.textContent.includes(${JSON.stringify(text)})); el.click(); return true })()`,
  enter: (selector) => `(() => { document.querySelector(${JSON.stringify(selector)})
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return true })()`,
  paste: (
    selector,
    text,
  ) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus();
    const dt = new DataTransfer(); dt.setData('text', ${JSON.stringify(text)});
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return true })()`,
  has: (text) => `document.body.innerText.includes(${JSON.stringify(text)})`,
  bubbles: (text) => `[...document.querySelectorAll('[role=log] span')]
    .filter(s => s.children.length === 0 && s.textContent === ${JSON.stringify(text)}).length`,
  label: (label) => `!!document.querySelector('[aria-label=${JSON.stringify(label)}]')`,
}

const push = (body) =>
  fetch(`${MOCK}/_push`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
const stats = async () => (await fetch(`${MOCK}/_stats`)).json()
const incoming = (chatId, id, text, sender = {}) => ({
  typeWebhook: 'incomingMessageReceived',
  idMessage: id,
  timestamp: Date.now() / 1000,
  senderData: { chatId, ...sender },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
})

const results = []
async function step(id, title, fn) {
  try {
    await fn()
    results.push([id, title, 'PASS', ''])
    console.log('PASS', id, title)
  } catch (e) {
    results.push([id, title, 'FAIL', e.message])
    console.log('FAIL', id, title, '—', e.message)
  }
}

const tab1 = await newTab()
await tab1.send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
  mobile: false,
})
await tab1.waitFor(`document.readyState === 'complete'`, 'загрузка')
await tab1.evaluate('localStorage.clear(); true')
await tab1.send('Page.reload')
await tab1.waitFor(js.has('Вход'), 'экран входа')

const ANNA = 'c79161234567'

await step('E2E-1', 'Неверный токен — ошибка входа', async () => {
  await tab1.evaluate(js.type('input[inputmode=numeric]', '4100000001'))
  await tab1.evaluate(js.type('input[type=password]', 'bad'))
  await tab1.evaluate(js.click('details summary'))
  await tab1.evaluate(js.type('input[inputmode=url]', MOCK))
  await tab1.evaluate(js.click('button[type=submit]'))
  await tab1.waitFor(js.has('Неверный idInstance или apiTokenInstance'), 'текст ошибки')
})

await step('E2E-2', 'Верные данные — экран чатов', async () => {
  await tab1.evaluate(js.type('input[type=password]', 'good'))
  await tab1.evaluate(js.click('button[type=submit]'))
  await tab1.waitFor(js.has('Чаты'), 'заголовок «Чаты»')
})

await step('E2E-3', 'Чат по номеру в формате «8 (9xx)…»', async () => {
  await tab1.evaluate(js.click('[aria-label="Новый чат"]'))
  await tab1.waitFor(js.label('Номер телефона'), 'окно «Новый чат»')
  await tab1.evaluate(js.paste('[aria-label="Номер телефона"]', '8 (916) 123-45-67'))
  await tab1.waitFor(
    `!document.querySelector('[role=dialog] button[type=submit]').disabled`,
    'кнопка активна',
  )
  await tab1.evaluate(js.click('[role=dialog] button[type=submit]'))
  await tab1.waitFor(
    `[...document.querySelectorAll('h2')].some(h => h.textContent === '+7 916 123-45-67')`,
    'шапка чата',
  )
})

await step('E2E-4', 'Отправка «Привет»: доставка и статусы, без дублей', async () => {
  await tab1.evaluate(js.type('textarea', 'Привет'))
  await tab1.evaluate(js.enter('textarea'))
  await tab1.waitFor(js.label('Отправлено'), 'статус «Отправлено»')
  const s = await stats()
  if (JSON.stringify(s.sent.at(-1)) !== JSON.stringify({ chatId: ANNA, message: 'Привет' }))
    throw new Error('sendMessage: ' + JSON.stringify(s.sent))
  await push({
    typeWebhook: 'outgoingAPIMessageReceived',
    idMessage: 'srv-1',
    timestamp: Date.now() / 1000,
    senderData: { chatId: ANNA },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
  })
  await push({
    typeWebhook: 'outgoingMessageStatus',
    chatId: ANNA,
    idMessage: 'srv-1',
    status: 'read',
  })
  await tab1.waitFor(js.label('Прочитано'), 'статус «Прочитано»')
  const n = await tab1.evaluate(js.bubbles('Привет'))
  if (n !== 1) throw new Error(`пузырей «Привет»: ${n}`)
})

await step('E2E-5', 'Ответ получателя появляется, чат отмечается прочитанным', async () => {
  await push(incoming(ANNA, 'in-1', 'И тебе привет'))
  await tab1.waitFor(`${js.bubbles('И тебе привет')} === 1`, 'входящее сообщение')
  await tab1.waitFor(
    `fetch('${MOCK}/_stats').then(r => r.json()).then(s => s.reads.includes('${ANNA}'))`,
    'readChat',
  )
})

await step('E2E-6', 'Сообщение в другой чат — бейдж непрочитанных', async () => {
  await push(
    incoming('c7000', 'in-2', 'Ты тут?', { chatName: 'Мария', senderPhoneNumber: 79257654321 }),
  )
  await tab1.waitFor(js.label('Непрочитанных: 1'), 'бейдж')
})

await step('E2E-13', 'Сообщение, отправленное с телефона, видно как исходящее', async () => {
  await push({
    typeWebhook: 'outgoingMessageReceived',
    idMessage: 'ph-1',
    timestamp: Date.now() / 1000,
    senderData: { chatId: ANNA },
    messageData: {
      typeMessage: 'textMessage',
      textMessageData: { textMessage: 'Написал с телефона' },
    },
  })
  await tab1.waitFor(`${js.bubbles('Написал с телефона')} === 1`, 'исходящее с телефона')
})

await step('E2E-7', 'Перезагрузка — сессия и история на месте', async () => {
  await sleep(500) // debounce сохранения
  await tab1.send('Page.reload')
  await tab1.waitFor(
    js.has('Мария') + ` && ${js.has('+7 916 123-45-67')}`,
    'список чатов после перезагрузки',
  )
  await tab1.evaluate(js.clickText('li button', '+7 916 123-45-67'))
  await tab1.waitFor(
    `${js.bubbles('И тебе привет')} === 1 && ${js.bubbles('Привет')} === 1`,
    'история',
  )
})

await step('E2E-11', 'Номер без аккаунта — понятная ошибка', async () => {
  await tab1.evaluate(js.click('[aria-label="Новый чат"]'))
  await tab1.waitFor(js.label('Номер телефона'), 'окно')
  await tab1.evaluate(js.paste('[aria-label="Номер телефона"]', '+7 999 000-00-00'))
  await tab1.waitFor(
    `!document.querySelector('[role=dialog] button[type=submit]').disabled`,
    'кнопка активна',
  )
  await tab1.evaluate(js.click('[role=dialog] button[type=submit]'))
  await tab1.waitFor(js.has('Аккаунт Telegram с этим номером не найден'), 'текст ошибки')
  await tab1.evaluate(js.click('[aria-label="Закрыть"]'))
  await tab1.waitFor(`!document.querySelector('[role=dialog]')`, 'окно закрыто')
})

await step('E2E-8', 'Без сети: «Нет сети», сообщение «не отправлено»', async () => {
  await tab1.send('Network.enable')
  await tab1.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await tab1.waitFor(js.has('Нет сети'), 'полоса «Нет сети»', 15000)
  await tab1.evaluate(js.type('textarea', 'Офлайн'))
  await tab1.evaluate(js.enter('textarea'))
  await tab1.waitFor(js.label('Не отправлено'), 'статус «Не отправлено»')
})

await step('E2E-9', 'Сеть вернулась: «Повторить» доставляет, опрос восстановлен', async () => {
  await tab1.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await tab1.waitFor(`!${js.has('Нет сети')}`, 'полоса пропала', 15000)
  await tab1.evaluate(js.clickText('button', 'Повторить'))
  await tab1.waitFor(`!${js.label('Не отправлено')}`, 'статус обновился')
  await push(incoming(ANNA, 'in-3', 'Снова на связи'))
  await tab1.waitFor(`${js.bubbles('Снова на связи')} === 1`, 'опрос работает')
})

let tab2
await step('E2E-10', 'Две вкладки: очередь читает одна, сообщение в обеих без дублей', async () => {
  tab2 = await newTab()
  await tab2.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await tab2.waitFor(js.has('Чаты'), 'вторая вкладка открылась')
  const locks = `navigator.locks.query().then(q => [q.held.filter(l => l.name.startsWith('greenchat-poller')).length, q.pending.filter(l => l.name.startsWith('greenchat-poller')).length].join('/'))`
  await tab2.waitFor(
    `${locks}.then(v => v === '1/1')`,
    'одна вкладка держит блокировку, вторая ждёт',
  )
  await tab2.evaluate(js.clickText('li button', '+7 916 123-45-67'))
  await push(incoming(ANNA, 'in-4', 'Обеим вкладкам'))
  await tab1.waitFor(`${js.bubbles('Обеим вкладкам')} === 1`, 'вкладка 1')
  await tab2.waitFor(`${js.bubbles('Обеим вкладкам')} === 1`, 'вкладка 2')
  await sleep(500)
  for (const [t, n] of [
    [tab1, 1],
    [tab2, 2],
  ]) {
    const c = await t.evaluate(js.bubbles('Обеим вкладкам'))
    if (c !== 1) throw new Error(`вкладка ${n}: ${c} копий`)
  }
  // Сообщение, отправленное во второй вкладке, появляется в первой
  await tab2.evaluate(js.type('textarea', 'Из второй вкладки'))
  await tab2.evaluate(js.enter('textarea'))
  await tab1.waitFor(
    `${js.bubbles('Из второй вкладки')} === 1`,
    'отправленное видно в первой вкладке',
  )
  // Закрываем первую — опрос подхватывает вторая
  await fetch(`http://127.0.0.1:${PORT}/json/close/${tab1.targetId}`)
  await tab2.waitFor(`${locks}.then(v => v === '1/0')`, 'вторая вкладка забрала блокировку')
  await push(incoming(ANNA, 'in-5', 'После закрытия первой'))
  await tab2.waitFor(`${js.bubbles('После закрытия первой')} === 1`, 'вкладка 2 получает сообщения')
})

await step('E2E-12', 'Мобильная ширина 375 px: список ↔ чат', async () => {
  await tab2.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 760,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await sleep(300)
  const visible = (sel) =>
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); return !!el && el.getBoundingClientRect().width > 0 })()`
  await tab2.waitFor(visible('[role=log]') + ` && !${visible('aside')}`, 'открыт чат, список скрыт')
  const shot = await tab2.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(OUT, 'e2e-mobile-chat.png'), Buffer.from(shot.data, 'base64'))
  await tab2.evaluate(js.click('[aria-label="Назад к чатам"]'))
  await tab2.waitFor(visible('aside') + ` && !${visible('[role=log]')}`, 'список виден, чат скрыт')
})

const s = await stats()
console.log(
  '\nmock stats:',
  JSON.stringify({ receiveCalls: s.receiveCalls, sent: s.sent.length, reads: s.reads.length }),
)
console.log('\n| Сценарий | Проверка | Результат | Комментарий |\n|---|---|---|---|')
for (const [id, title, res, note] of results)
  console.log(`| ${id} | ${title} | ${res === 'PASS' ? '✅' : '❌'} | ${note} |`)
writeFileSync(join(OUT, 'e2e-results.json'), JSON.stringify(results, null, 2))
chrome.kill()
process.exit(results.some((r) => r[2] === 'FAIL') ? 1 : 0)
