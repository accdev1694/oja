import InputField from "../InputField"
import StoreSelect from "../StoreSelect"

const Main = ({setBalance}) => {
  return (
    <>
      <div className="flex gap-4">
        {/* Add Budget */}
        {/* (ensure user CANT type 0 or lower) */}

        <InputField
          className="w-[50%] text-center rounded-[24px_0_0_24px]  py-2 bg-light text-md"
          placeholder="Add Budget"
          type="number"
          value={null}
          onChange={(e) => {
            setBalance(e.target.value);
          }}
        />

        {/* Select Store */}
        <StoreSelect className="w-[50%] rounded-[0_24px_24px_0] px-4 py-2 bg-light focus:outline-none transition" />
      </div>
    </>
  );
};

export default Main;
