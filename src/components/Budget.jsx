const Budget = ({ amount }) => {
  return (
    <>
      <p className="text-xs">Budget:</p>
      <h1 className="font-bold text-5xl mb-6">£{amount}</h1>
    </>
  );
};

export default Budget;
