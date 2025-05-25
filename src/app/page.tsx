"use client";

import { MixlayerChat } from "@mixlayer/react-chat";
import Image from "next/image";
import Robot from "../../public/robot.svg";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full -mt-16">
      <Image src={Robot} alt="Mixlayer" className="w-[240px] h-[240px]" />
      <div className="text-xl text-gray-700 font-semibold mt-8">
        <a
          href="https://modelsocket.github.io"
          target="_blank"
          className="hover:underline underline-offset-4"
        >
          ModelSocket
        </a>{" "}
        Chat
      </div>
      <div className="text-gray-500 mt-2 text-sm">
        Powered by{" "}
        <a
          className="underline underline-offset-4 hover:text-black"
          href="https://mixlayer.com"
          target="_blank"
        >
          Mixlayer
        </a>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="w-screen h-full">
      <MixlayerChat url="/api/chat" emptyState={<EmptyState />} />
    </div>
  );
}

export default Home;
