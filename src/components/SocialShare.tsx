import ShareFacebook from "./Icons/ShareFacebook";
import ShareInstagram from "./Icons/ShareInstagram";
import ShareThreads from "./Icons/ShareThreads";

const SocialShare = () => {
  return (
    <div className="flex items-center gap-6">
      <span className="label-1 text-gray-900 font-semibold"> Chia sẻ </span>
      <div className="flex items-center gap-1.5">
        <a href="#" target="_blank" rel="noopener noreferrer nofollow" className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out">
          <ShareFacebook />
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer nofollow" className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out">
          <ShareInstagram />
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer nofollow" className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out">
          <ShareThreads />
        </a>
      </div>
    </div>
  );
};

export default SocialShare;
