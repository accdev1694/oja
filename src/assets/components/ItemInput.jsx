import { useState } from "react";

const ItemInput = ({ items, error, loading }) => {
  const [itemName, setItemName] = useState(""); // item name typed into input field
  const [selectedItem, setSelectedItem] = useState(null); // item object matched based on search field
  const [itemsList, setItemsList] = useState([]); //contains updated list of selected items
  const [missing, setMissing] = useState("");

  const handleChange = (e) => {
    const value = e.target.value;
    setItemName(value);
    const found = items.find((item) => item.name === value);

    setSelectedItem(found || null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem) {
      setMissing("item is not listed");
    } else {
      setItemsList([...itemsList, selectedItem]);
      setItemName("");
      setSelectedItem(null);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex justify-between items-center gap-12 bg-orange-500/20 w-80 p-2 rounded-full mt-2"
      >
        {error && <div>Could not fetch Data</div>}
        {loading && <div>... Loading Groceries</div>}
        <input
          className="px-2 outline-none w-[80%] text-center"
          type="text"
          list="items"
          id="item"
          placeholder="Select or type an item"
          value={itemName}
          onChange={handleChange}
        />
        <datalist id="items">
          {items.map((item) => (
            <option key={item.id} value={item.name}></option>
          ))}
        </datalist>
        <button
          className=" cursor-pointer shadow-md shadow-red-800 rounded-full"
          type="submit"
        >
          <img className="w-8" src="/add.png" alt="Plus Icon" />
        </button>
      </form>

      <div className="">
        {itemsList.map((i) => (
          <div key={i.id} className="">
            <p>{i.name}</p>
          </div>
        ))}
      </div>
    </>
  );
};

export default ItemInput;
