import { siteConfig as SITE } from "@/lib/site";
import type { Page } from "@/lib/commerce/types";

const ADDRESS = "Calle Mayor 1, 28013 Madrid, Spain";
const SCHEDULE = "Monday to Friday, 9:00 to 18:00";

const pagesEn: Record<string, Page> = {
  about: {
    title: "About us",
    body: `<p>Animemerchan is a shop specialising in anime and manga merchandise imported directly from Japan. We hand-pick action figures, manga, apparel and collectibles from franchises such as Dragon Ball, One Piece, Naruto, Jujutsu Kaisen, Demon Slayer, Attack on Titan and Chainsaw Man.</p>

<h2>Who we are</h2>
<p>We are a small team of fans who started buying figures for our own collections and ended up importing them for other collectors. We do not sell second-hand items or replicas: everything that leaves our warehouse is original and factory sealed.</p>

<h2>What we sell</h2>
<ul>
<li><strong>Action figures</strong>: 8 to 30 cm tall, with the original box and all accessories.</li>
<li><strong>Manga and volumes</strong>: in Japanese, single volumes or complete sets.</li>
<li><strong>Apparel</strong>: t-shirts, hoodies and socks with official designs.</li>
<li><strong>Collectibles</strong>: pins, coasters, cards and limited-edition figures.</li>
</ul>

<h2>How we work</h2>
<ol>
<li>We buy directly from Japanese distributors, with no middlemen.</li>
<li>We check the condition and packaging of every piece before packing it.</li>
<li>We ship from our warehouse in Madrid, usually within 24-48 working hours.</li>
<li>We reply by email before and after your order.</li>
</ol>

<h2>Where we are</h2>
<p>${SITE.name}<br />${ADDRESS}<br />${SITE.email}<br />${SITE.phone}</p>

<h2>Academic project</h2>
<p>This website is a <strong>university academic project</strong>. No real products are sold and no real payments are processed: it is a functional demonstration of an online store built with Next.js, Supabase and Stripe.</p>`,
    bodySummary:
      "Anime and manga merchandise imported from Japan: figures, manga, apparel and original collectibles.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-03-10T00:00:00.000Z",
    seo: {
      title: "About us",
      description:
        "Anime and manga merchandise imported from Japan: figures, manga, apparel and original collectibles.",
    },
  },

  contacto: {
    title: "Contact",
    body: `<p>We are here to answer any questions before or after your order. Write to us and we will reply within 24 working hours.</p>

<h2>Email</h2>
<p><a href="mailto:${SITE.email}">${SITE.email}</a><br />The fastest way to ask anything about an order.</p>

<h2>Phone</h2>
<p><a href="${SITE.phoneHref}">${SITE.phone}</a><br />${SCHEDULE}</p>

<h2>Address</h2>
<p>${ADDRESS}</p>

<h2>Before you write</h2>
<ul>
<li>For <strong>order status</strong>, include your order number and the email address you used to buy.</li>
<li>For <strong>a return</strong>, check the <a href="/devoluciones">returns policy</a> first and have photos of the product ready.</li>
<li>For <strong>questions about a specific product</strong>, give the exact item reference.</li>
</ul>

<h2>Response time</h2>
<p>We reply to every message within 24 working hours. If your message arrives before 14:00 on a working day, we reply the same day.</p>`,
    bodySummary:
      "Email, phone, opening hours and customer service address for Animemerchan.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-02-18T00:00:00.000Z",
    seo: {
      title: "Contact",
      description:
        "Email, phone, opening hours and customer service address for Animemerchan.",
    },
  },

  envios: {
    title: "Shipping & delivery",
    body: `<p>We ship throughout mainland Spain and the rest of the European Union. Every shipment includes a tracking number you can check from your account.</p>

<h2>Delivery times</h2>
<table>
<thead><tr><th>Service</th><th>Time</th><th>Tracking</th></tr></thead>
<tbody>
<tr><td>Standard, mainland</td><td>24-48 working hours</td><td>Yes</td></tr>
<tr><td>Standard, Europe</td><td>3-5 working days</td><td>Yes</td></tr>
<tr><td>Express, mainland</td><td>24 hours</td><td>Yes</td></tr>
<tr><td>Collection in Madrid</td><td>2 hours, by appointment</td><td>No</td></tr>
</tbody>
</table>
<p>Delivery times start when the order leaves our warehouse, not when payment is made.</p>

<h2>Shipping cost</h2>
<table>
<thead><tr><th>Destination</th><th>Standard</th><th>Express</th></tr></thead>
<tbody>
<tr><td>Mainland</td><td>€4.90</td><td>€9.90</td></tr>
<tr><td>Balearic and Canary Islands</td><td>€12.90</td><td>€19.90</td></tr>
<tr><td>Europe</td><td>€14.90</td><td>€24.90</td></tr>
</tbody>
</table>

<h2>Free shipping</h2>
<p>Standard shipping is <strong>free on orders from ${SITE.freeShippingThreshold} €</strong>. No code needed: the discount is applied automatically once the cart reaches that amount.</p>

<h2>Orders before 14:00</h2>
<p>Orders confirmed before 14:00 on a working day are dispatched the same day. After that time, shipping starts on the next working day.</p>

<h2>Pre-orders and backorders</h2>
<p>Items marked as <strong>Coming soon</strong> or <strong>Backorder</strong> are not in stock yet. The product page shows the estimated availability date; pre-ordered items can be cancelled free of charge if that date is delayed by more than 30 days.</p>

<h2>Delivery addresses</h2>
<p>You can save several addresses in <a href="/account/addresses">your account</a> and pick one at checkout. The courier notifies you by email and SMS when the parcel is out for delivery.</p>

<h2>If your order does not arrive</h2>
<p>If 5 working days pass from the estimated date and tracking shows no updates, write to us and we will investigate. If the parcel is marked as lost, we reship or refund the product free of charge.</p>`,
    bodySummary:
      "Delivery times, shipping costs, free shipping from €60, tracking and what to do if your order does not arrive.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-04-02T00:00:00.000Z",
    seo: {
      title: "Shipping & delivery",
      description:
        "Delivery times, shipping costs, free shipping from €60 and order tracking.",
    },
  },

  devoluciones: {
    title: "Returns",
    body: `<p>You have <strong>30 days from delivery</strong> to return any unused product in its original packaging. The process is free: the collection courier is paid by us.</p>

<h2>How to return a product</h2>
<ol>
<li>Request the return from your account, in <a href="/account/orders">My orders</a>.</li>
<li>Give the reason and, if you like, attach photos of the product's condition.</li>
<li>Pack the product in its original box with all its accessories.</li>
<li>Print the label we email you or take the parcel to a drop-off point.</li>
<li>We email you when the parcel arrives and check its condition.</li>
</ol>

<h2>Conditions</h2>
<ul>
<li>The product must be <strong>unused</strong>, undamaged and keep its original label.</li>
<li>It must include all accessories: box, manuals, stickers and loose pieces.</li>
<li>Personalised products cannot be returned.</li>
<li>Opening the box to check quality does not count as use.</li>
</ul>

<h2>Damaged product or manufacturing fault</h2>
<p>If the product arrives broken or does not match what was advertised, email us with photos and we will send a replacement free of charge. You do not need to return the product until we confirm the issue.</p>

<h2>Refund</h2>
<p>We issue the refund within <strong>7 days of receiving the return</strong>, to the same payment method. Original shipping costs are only refunded if the mistake is ours.</p>

<h2>Exchanges</h2>
<p>We do not exchange directly. If you prefer another size, model or colour, return the product and place a new order.</p>

<h2>Cancellation</h2>
<p>You can cancel your order from your account as long as it has not been shipped. If it is already in transit, wait for delivery and return it: collection is still free.</p>`,
    bodySummary:
      "Free returns within 30 days: how to do it, conditions, refunds and cancellations.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-03-28T00:00:00.000Z",
    seo: {
      title: "Returns",
      description:
        "Return any product free of charge within 30 days. Refunds within 7 days.",
    },
  },

  "preguntas-frecuentes": {
    title: "FAQ",
    body: `<p>We answer the questions we get most often by email. If yours is not here, write to us at <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>

<h2>About the products</h2>

<h3>Where do the products come from?</h3>
<p>All merchandise is imported directly from Japan through our regular suppliers. We never buy from the second-hand market.</p>

<h3>Are the products original?</h3>
<p>Yes. Every piece is original and factory sealed. The product page lists the manufacturer and scale so you can verify it.</p>

<h3>What is the difference between pre-order and backorder?</h3>
<p>In a <strong>pre-order</strong> the item has been announced but has not yet reached our warehouse. With a <strong>backorder</strong> we request it from the supplier after your purchase. In both cases the estimated date appears on the product page.</p>

<h3>Do the figures include accessories?</h3>
<p>Yes, unless the product page says otherwise. If a piece is missing when the parcel arrives, treat it as an issue and we will send it free of charge.</p>

<h2>About shipping</h2>

<h3>How much does shipping cost?</h3>
<p>€4.90 on the mainland and €14.90 in Europe. It is <strong>free from ${SITE.freeShippingThreshold} €</strong> on standard shipping, with no code.</p>

<h3>Can I cancel an order?</h3>
<p>You can cancel from your account as long as it has not been shipped. After delivery, the option is a free return.</p>

<h3>Do you ship to the Canary Islands or abroad?</h3>
<p>Yes, to the Canary Islands and Balearic Islands with their own rates, and to the rest of the European Union within 3 to 5 working days.</p>

<h2>About payment</h2>

<h3>Which payment methods do you accept?</h3>
<p>Credit and debit cards, Bizum, PayPal and bank transfer. Payment is processed securely through Stripe.</p>

<h3>Can I pay on delivery?</h3>
<p>No. For security we only accept payment in advance.</p>

<h2>About your account</h2>

<h3>Do I need an account to buy?</h3>
<p>No, you can check out as a guest. The account is only for tracking orders, saving addresses and using the wishlist.</p>

<h3>How do I delete my account?</h3>
<p>Write to us from the email address you registered with and we will delete it within 72 hours, along with all your personal data.</p>`,
    bodySummary:
      "Product origin, authenticity, shipping, payments and account management.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-04-15T00:00:00.000Z",
    seo: {
      title: "FAQ",
      description:
        "Everything you need to know before buying: origin, shipping, payments and returns.",
    },
  },

  "aviso-legal": {
    title: "Legal notice",
    body: `<p>This notice governs the use of the website and purchases on ${SITE.name}. Browsing the site means you accept these conditions.</p>

<h2>1. Site owner</h2>
<p>${SITE.name}<br />${ADDRESS}<br />${SITE.email}<br />${SITE.phone}</p>

<h2>2. Purpose and conditions</h2>
<p>This site sells anime and manga merchandise. By placing an order you accept these conditions, the <a href="/devoluciones">returns</a> policy and the <a href="/privacidad">privacy policy</a>.</p>

<h2>3. Prices and VAT</h2>
<p>All prices are shown in euros and <strong>include VAT</strong>. The final total including shipping is shown before you confirm payment and does not change afterwards.</p>

<h2>4. Payments</h2>
<p>We accept card, Bizum, PayPal and bank transfer. The order is confirmed once payment is authorised. Card details are processed directly through Stripe and are not stored on our servers.</p>

<h2>5. Availability</h2>
<p>Limited-edition items may sell out between adding them to the cart and confirming payment. If that happens, we tell you and refund the amount.</p>

<h2>6. Intellectual property</h2>
<p>The logos, brands, characters and titles of the franchises belong to their respective owners. This store sells physical products from those owners; it is not affiliated with or sponsored by them.</p>

<h2>7. Liability</h2>
<p>We are liable for direct damage arising from misuse of the site. We are not liable for loss of profit or indirect damage.</p>

<h2>8. Applicable law</h2>
<p>These conditions are governed by Spanish law. Any dispute will be subject to the courts and tribunals of Madrid.</p>

<h2>9. Academic project</h2>
<p>This website is a university academic project. No real products are sold, no real payments are taken and card details are fictitious.</p>`,
    bodySummary:
      "General terms of use of the store: owner, prices, payments, intellectual property and applicable law.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-02-25T00:00:00.000Z",
    seo: {
      title: "Legal notice",
      description:
        "General terms of use of the store: owner, prices with VAT, payments and applicable law.",
    },
  },

  privacidad: {
    title: "Privacy policy",
    body: `<p>This policy explains what personal data we collect, what we use it for and how you can exercise your rights under the GDPR and the Spanish Data Protection Act.</p>

<h2>1. Data controller</h2>
<p>${SITE.name}<br />${ADDRESS}<br />${SITE.email}</p>

<h2>2. What data we collect</h2>
<table>
<thead><tr><th>Data</th><th>When</th><th>Required</th></tr></thead>
<tbody>
<tr><td>First and last name</td><td>When you register</td><td>Yes</td></tr>
<tr><td>Email address</td><td>When you register or buy</td><td>Yes</td></tr>
<tr><td>Shipping address</td><td>When you place an order</td><td>Yes</td></tr>
<tr><td>Phone number</td><td>When you place an order</td><td>No</td></tr>
<tr><td>Wishlist</td><td>When you save products</td><td>No</td></tr>
<tr><td>Payment details</td><td>Processed by Stripe</td><td>We do not store them</td></tr>
</tbody>
</table>

<h2>3. What we use it for</h2>
<ul>
<li>Handling your order, shipping and returns.</li>
<li>Creating and maintaining your account and wishlist.</li>
<li>Sending you the invoice and order notifications.</li>
<li>Answering your questions by email.</li>
<li>Meeting legal and accounting obligations.</li>
</ul>
<p>We do not build user profiles or run personalised advertising with your data.</p>

<h2>4. Legal basis</h2>
<p>We process data to <strong>perform the contract</strong> (purchase and account) and to <strong>comply with legal obligations</strong>. Processing for marketing purposes requires your consent, which you can withdraw at any time.</p>

<h2>5. Who we share it with</h2>
<p>Only with the suppliers needed to provide the service:</p>
<ul>
<li><strong>Supabase</strong>: database and user authentication.</li>
<li><strong>Stripe</strong>: payment gateway.</li>
<li><strong>Courier company</strong>: name, address and phone number to deliver the parcel.</li>
</ul>
<p>We do not sell or pass your data to third parties for commercial purposes.</p>

<h2>6. Retention</h2>
<p>Account data is kept while the account is active. Order data is kept for <strong>5 years</strong> under tax obligations. Unused addresses are deleted after one year.</p>

<h2>7. Your rights</h2>
<p>You can request <strong>access</strong>, <strong>rectification</strong>, <strong>erasure</strong>, <strong>restriction</strong> and <strong>objection</strong> to processing, and withdraw your consent at any time. You can also lodge a complaint with the Spanish Data Protection Agency.</p>
<p>Email us at <a href="mailto:${SITE.email}">${SITE.email}</a> and we will handle your request within 72 hours.</p>

<h2>8. Security</h2>
<p>We use TLS encryption, per-user access control and regular backups. No system is infallible, but we apply reasonable technical and organisational measures.</p>`,
    bodySummary:
      "What personal data we process, for what purpose, how long we keep it and how to exercise your rights.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-03-05T00:00:00.000Z",
    seo: {
      title: "Privacy policy",
      description:
        "What personal data we process, for what purpose and how to exercise your GDPR rights.",
    },
  },

  cookies: {
    title: "Cookies policy",
    body: `<p>We use cookies and similar technologies to make the site work properly and to understand how it is used. This policy explains which ones we use and why.</p>

<h2>1. What cookies are</h2>
<p>Small files your browser stores on your device. There are <strong>technical</strong> cookies, needed for the site to work, and <strong>third-party</strong> cookies, set by an external service to measure usage or show advertising.</p>

<h2>2. First-party cookies (technical)</h2>
<p>They are essential: without them the cart and the session do not work.</p>
<table>
<thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
<tbody>
<tr><td>cart</td><td>Stores the products in your cart</td><td>Session</td></tr>
<tr><td>language</td><td>Remembers whether you prefer Spanish or English</td><td>1 year</td></tr>
<tr><td>session</td><td>Keeps you signed in</td><td>Session</td></tr>
</tbody>
</table>

<h2>3. Third-party cookies</h2>
<ul>
<li><strong>Stripe</strong>: handles payment in its own frame and uses its own cookies to prevent fraud.</li>
<li><strong>Analytics</strong>: aggregated page-view metrics. We do not store personally identifiable data.</li>
</ul>

<h2>4. How to manage them</h2>
<p>You can delete or block cookies from your browser settings. Bear in mind that blocking technical cookies will stop the cart and sign-in from working.</p>

<h2>5. Consent</h2>
<p>Non-technical cookies require your consent first. You can accept or reject them from the cookie notice and change your mind later at any time.</p>

<h2>6. Changes to this policy</h2>
<p>We update this page if the services we use change. The date of the last update appears at the end of the document.</p>`,
    bodySummary:
      "Which cookies the site uses, which are technical, which are third-party and how to manage them.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-02-11T00:00:00.000Z",
    seo: {
      title: "Cookies policy",
      description:
        "Technical and third-party cookies used by the site, and how to manage or revoke them.",
    },
  },
};

export function getPageEn(handle: string): Page | null {
  return pagesEn[handle] ?? null;
}
