import Balance from "../Balance";

const Header = ({ balance }) => {
  return (
    <div className="flex justify-between align-end">
      <Balance balance={balance} />
    </div>
  );
};

export default Header;
