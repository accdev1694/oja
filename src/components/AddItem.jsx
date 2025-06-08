
const AddItem = () => {
  return (
    <div className="mt-6">
      <input className="rounded-full py-2 bg-light text-lg px-4 w-full focus:outline-none transition" type="text" list="items" id="item" name="item" placeholder="Add Item" required/>
      <datalist id="items">
        <option value="Rice" />
      </datalist>
    </div>
  );
};

export default AddItem;
