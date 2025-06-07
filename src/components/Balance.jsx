const Balance = ({ balance }) => {
  return (
    <div className="flex gap-2 items-end  mb-6">
      <p className="text-sm text-secondary">Balance:</p>
      <h1 className="font-bold text-5xl">£{balance}</h1>
    </div>
  );
};

export default Balance;
