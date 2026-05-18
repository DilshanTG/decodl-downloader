import { MessageCircleMore } from "lucide-react";

const MessageButton = () => {
  return (
    <li className="relative">
      <a
        className="h-8.5 w-8.5 border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 relative flex items-center justify-center rounded-full border-[0.5px] dark:text-white"
        href="/admin"
      >
        <MessageCircleMore className="size-5" />
      </a>
    </li>
  );
};

export default MessageButton;
