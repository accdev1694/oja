const Balance = ({ balance }) => {
  
  return (
    <div className="flex flex-col justify-center text-center align-center w-30">
      <h1 className="font-bold text-3xl">£{balance}</h1>
      <p className="text-xs text-secondary">Balance:</p>      
    </div>
  );
};

export default Balance;
