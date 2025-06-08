import { useState } from "react";
import Header from "./components/sections/Header";
import Main from "./components/sections/Main";
import Footer from "./components/sections/Footer";
function App() {
  const [balance, setBalance] = useState(0);
  console.log(balance);

  return (
    <div className="flex flex-col p-6 min-h-screen">
      <Header balance={balance} setBalance={setBalance} />
      <div className="flex-1 ">
        <Main setBalance={setBalance}/>
      </div>
      <Footer />
    </div>
  );
}

export default App;
