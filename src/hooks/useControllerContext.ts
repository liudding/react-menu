import { createContext, useContext } from "react";

export const ControllerContext = createContext<any | null>(null);

export const useControllerContext = () => {
  return useContext(ControllerContext);
};
