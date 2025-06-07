import InputField from "./components/InputField";
import StoreSelect from "./components/StoreSelect";
function App() {
  return (
    <div className="p-6">
      
      <div className="flex gap-4">
        {/* Add Budget */}
        {/* (ensure user CANT type 0 or lower) */}

        <InputField
          className="w-[50%] text-center rounded-[24px_0_0_24px]  py-2 bg-light text-md"
          placeholder="Add Budget"
          type="number"
        />

        {/* Select Store */}
        <StoreSelect className="w-[50%] rounded-[0_24px_24px_0] px-4 py-2 bg-light focus:outline-none transition" />
      </div>
    </div>
  );
}

export default App;
