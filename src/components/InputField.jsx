const InputField = ({placeholder, type, className, value, onChange}) => {
  return (    
    <input
      className={`${className}  focus:outline-none transition`}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
    />
  );
};

export default InputField;



