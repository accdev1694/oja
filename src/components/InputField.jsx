const InputField = ({placeholder, type, className}) => {
  return (
    
    <input
      className={`${className}  focus:outline-none transition`}
      type={type}
      placeholder={placeholder}
    />
  );
};

export default InputField;
