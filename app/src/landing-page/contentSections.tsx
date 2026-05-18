import daBoiAvatar from "../client/static/da-boi.webp";
import kivo from "../client/static/examples/kivo.webp";
import messync from "../client/static/examples/messync.webp";
import microinfluencerClub from "../client/static/examples/microinfluencers.webp";
import promptpanda from "../client/static/examples/promptpanda.webp";
import type { GridFeature } from "./components/FeaturesGrid";

export const features: GridFeature[] = [
  {
    name: "Pay in LKR",
    description: "No USD conversion headaches, high bank fees, or international transaction blockages. Pay purely in Sri Lankan Rupees.",
    emoji: "🇱🇰",
    href: "",
    size: "medium",
  },
  {
    name: "Instant Downloads",
    description: "Submit any valid URL and receive your clean, high-resolution original asset in seconds. No waiting in queues.",
    emoji: "⚡",
    href: "",
    size: "medium",
  },
  {
    name: "Credits Never Expire",
    description: "Buy once and use whenever you need. Your unused credits will remain safely in your account forever.",
    emoji: "♾️",
    href: "",
    size: "medium",
  },
  {
    name: "Auto-Refund Guarantee",
    description: "If a download fails due to provider downtime or technical issues, your credits are refunded instantly and atomically.",
    emoji: "🛡️",
    href: "",
    size: "large",
  },
  {
    name: "20+ Premium Providers",
    description: "One account to access Envato Elements, Shutterstock, Freepik, Adobe Stock, iStock, Flaticon, and many more premium catalogs.",
    emoji: "📦",
    href: "",
    size: "large",
  },
  {
    name: "No Subscription Commitment",
    description: "Enjoy ultimate pay-as-you-go flexibility. Buy credit packages only when you have client projects — no recurring monthly charges.",
    emoji: "🎯",
    href: "",
    size: "medium",
  },
  {
    name: "Smart URL Detection",
    description: "Paste a link and our system instantly detects the provider, shows you the exact credit cost, and prepares your file.",
    emoji: "🧠",
    href: "",
    size: "medium",
  },
  {
    name: "Secure Local Payments",
    description: "Pay securely using local debit/credit cards, mobile wallets, or bank transfers via PayHere — Sri Lanka's leading gateway.",
    emoji: "🔒",
    href: "",
    size: "medium",
  },
];

export const testimonials = [
  {
    name: "Pradeep Kumara",
    role: "Freelance Creative Designer",
    avatarSrc: daBoiAvatar,
    socialUrl: "",
    quote: "StockMart has been an absolute game-changer. I no longer have to pay high USD markup rates or worry about credit card blocks. I just buy credits in LKR and get my vectors instantly.",
  },
  {
    name: "Dilini Senanayake",
    role: "Agency Art Director",
    avatarSrc: daBoiAvatar,
    socialUrl: "",
    quote: "Downloading premium Envato and Shutterstock assets for client pitches is now incredibly cheap and fast. The auto-refund feature on failed jobs gives us complete peace of mind.",
  },
  {
    name: "Kasun Jayawardena",
    role: "UI/UX & Video Editor",
    avatarSrc: daBoiAvatar,
    socialUrl: "",
    quote: "No subscription trap! I buy the Rs. 4,500 package, edit my videos using high-res iStock and Adobe Stock footage, and only top-up when the next project comes in.",
  },
];

export const faqs = [
  {
    id: 1,
    question: "What is StockMart.lk?",
    answer: "StockMart.lk is a credit-based utility designed for Sri Lankan designers and agencies. It allows you to purchase credits in local currency (LKR) and use them to instantly download premium assets from 20+ global stock sites without a credit card or USD conversion fees.",
  },
  {
    id: 2,
    question: "How do credit charges work?",
    answer: "Each provider has a transparent, fixed credit cost. For instance, Shutterstock normal images cost 1 credit, Freepik costs 0.5 credits, and Envato Elements costs 1 credit. The exact cost is shown before you confirm your download.",
  },
  {
    id: 3,
    question: "Do my credits expire?",
    answer: "No! All credit packages purchased on StockMart have lifetime validity. They will never expire, allowing you to use them at your own pace.",
  },
  {
    id: 4,
    question: "What happens if a download fails?",
    answer: "Our system runs on atomic transactions. If the provider API returns an error or fails to fetch your asset, the system automatically refunds your credits immediately, so you never lose balance on unsuccessful jobs.",
  },
  {
    id: 5,
    question: "Which payment options are available?",
    answer: "We support Visa, Mastercard, AMEX, and local mobile wallets (like Genie or eZ Cash) via PayHere. All transactions are completely secure and processed in LKR.",
  },
];

export const footerNavigation = {
  app: [
    { name: "Pricing", href: "/pricing" },
    { name: "Login", href: "/login" },
    { name: "Sign Up", href: "/signup" },
    { name: "Refund Policy", href: "/refund-policy" },
  ],
  company: [
    { name: "DigiMart Solutions (Pvt) Ltd", href: "https://digimartsolutions.lk" },
    { name: "WhatsApp Support", href: "https://wa.me/94772503124" },
    { name: "support@stockmart.lk", href: "mailto:support@stockmart.lk" },
    { name: "Refund Policy", href: "/refund-policy" },
  ],
};

export const examples = [
  {
    name: "Shutterstock Images",
    description: "Get high-res stock photos, illustrations, and vector graphics.",
    imageSrc: kivo,
    href: "/login",
  },
  {
    name: "Freepik Premium",
    description: "Download premium vectors, stock photos, and PSD templates.",
    imageSrc: messync,
    href: "/login",
  },
  {
    name: "Adobe Stock",
    description: "Access premium photos, vector art, and creative templates.",
    imageSrc: microinfluencerClub,
    href: "/login",
  },
  {
    name: "Envato Elements",
    description: "Fetch web templates, graphic assets, and royalty-free audio.",
    imageSrc: promptpanda,
    href: "/login",
  },
];
