import { useEffect, useState } from "react";
import ItemsInput from "./ItemInput";

const Home = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/items")
    .then((res) => {
      if (!res.ok) {        
        setError(true)
        throw new Error('Network Error')
      }
      return res.json();
    })
    .then(data=>{
      setItems(data)
      setLoading(false)
      // console.log(data)
    }).catch(err=>{
      console.log(err)
    })
  }, []);
  return (
    <div className="flex justify-center">
      <ItemsInput items={items} setItems={setItems} error={error} loading={loading}/>
    </div>
  );
};

export default Home;
