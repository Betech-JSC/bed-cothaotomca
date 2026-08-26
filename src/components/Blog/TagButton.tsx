const TagButton = ({ href = "#0", text }: { href?: string; text: string }) => {
  return (
    <a
      href={href}
      className="mb-3 mr-3 inline-flex items-center justify-center rounded-full bg-yellow px-4 py-1.5 text-sm text-primary font-serif font-medium duration-300 hover:bg-primary hover:text-white"
    >
      {text}
    </a>
  );
};

export default TagButton;
