const AddItem = () => {
  return (
    <form className="flex gap-2 mt-6">
      <div className=" w-[40%]">
        <input
          className="rounded-[30px_0_0_30px] text-center py-2 bg-light text-lg px-4 w-full focus:outline-none transition"
          type="text"
          list="items"
          id="item"
          name="item"
          placeholder="Add Item"
          required
        />
        <datalist id="items">
          <option value="Rice" />
        </datalist>
      </div>
      <input className="w-[20%] text-center bg-light px-2" type="number" placeholder="Qty" required/>
      <button className="bg-light text-center w-[40%] rounded-[0_30px_30px_0]">Add</button>
    </form>
  );
};

export default AddItem;
