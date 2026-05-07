import { Outlet } from "react-router-dom";
import HomeButton from "./HomeButton";

function MainLayout() {
  return (
    <>
      <HomeButton />
      <Outlet />
    </>
  );
}

export default MainLayout;
