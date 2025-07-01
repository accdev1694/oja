import Select from "react-select";

const ItemsList = ({ items, error, loading, handleSubmit }) => {
  return (
    <>
      <form onSubmit={handleSubmit} className="">
        {error && <div>Could not fetch Data</div>}
        {loading && <div>... Loading Groceries</div>}
        <input
          type="text"
          list="items"
          id="item"
          placeholder="Select or type an item"
        />
        <datalist id="items">
          {items.map((item) => (
            <option key={item.id} value={item.name}></option>
          ))}
        </datalist>
        <button className="bg-green-900/50 px-6 border border-gray-500/50" type="submit"></button>
      </form>

      <div className=""></div>
    </>
  );
};

export default ItemsList;
