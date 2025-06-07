import FormItem from "./components/FormItem";
function App() {
  return (
    <div className="p-6">
      <div className="flex gap-4">
        {/* Add Budget */}
        <FormItem
          className="w-[50%] rounded-[24px_0_0_24px]"
          placeholder="Add Budget"
        />
        {/* Select Store */}
        <FormItem
          className="w-[50%] rounded-[0_24px_24px_0]"
          placeholder="Select Store"
        />
      </div>
    </div>
  );
}

export default App;
