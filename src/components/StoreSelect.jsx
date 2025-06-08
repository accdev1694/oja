const StoreSelect = ({className}) => {
  return (
    <select className={`${className}`} name="store" id="store" required>
      <option className="text-xs" value={null}>Select a Store</option>
      <option className="text-xs"  value="asda">Asda</option>
      <option className="text-xs"  value="lidl">Lidl</option>
      <option className="text-xs"  value="tesco">Tesco</option>
      <option className="text-xs"  value="morrisons">Morrisons</option>
    </select>
  );
};

export default StoreSelect;
