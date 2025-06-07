import { useState } from "react";
import InputField from "./components/InputField";
import StoreSelect from "./components/StoreSelect";
import Header from "./components/sections/Header";
import Main from "./components/sections/Main";
import Footer from "./components/sections/Footer";
function App() {
  const [balance, setBalance] = useState(0);
  return (
    <div className="p-6">
      <Header  balance={balance} setBalance={setBalance}/>
      <Main />
      <Footer />
      
      
    </div>
  );
}

export default App;
