import { motion } from 'framer-motion';

const QUOTES = [
  { text: "You don't rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "The successful warrior is the average man with laser-like focus.", author: "Bruce Lee" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "One hour of focused work is worth more than a day of distracted effort.", author: "Unknown" },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', emoji: '🌅' };
  if (h < 17) return { text: 'Good afternoon', emoji: '☀️' };
  if (h < 21) return { text: 'Good evening', emoji: '🌆' };
  return { text: 'Good night', emoji: '🌙' };
};

const getDailyQuote = () => QUOTES[new Date().getDate() % QUOTES.length];

interface Props { name: string }

export const Greeting = ({ name }: Props) => {
  const { text, emoji } = getGreeting();
  const quote = getDailyQuote();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-center space-y-3"
    >
      <h1 className="text-2xl font-bold text-white">
        {emoji} {text}, {name || 'there'}!
      </h1>
      <div className="glass-dark rounded-xl px-6 py-3 max-w-lg mx-auto">
        <p className="text-white/75 text-sm italic leading-relaxed">"{quote.text}"</p>
        <p className="text-purple-300 text-xs font-semibold mt-1.5">— {quote.author}</p>
      </div>
    </motion.div>
  );
};
