import Balance from "../Balance";
import Logo from "../Logo";

const Header = ({ balance, setBalance }) => {

  return (
    <div className="flex justify-between align-center">
      <Logo />
      <Balance balance={balance} setBalance={setBalance}/>
    </div>
  );
};

export default Header;
