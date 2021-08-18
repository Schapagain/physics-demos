import React from "react";
import ReactLoading from "react-loading";
export default function Loading() {
  return (
    <div className="fixed bg-blue-400 flex items-center justify-center inset-0 h-screen w-screen z-50">
      <ReactLoading type="bars" />
    </div>
  );
}
