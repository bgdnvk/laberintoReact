const GetRandomNumber = (seed = Math.random() * (100 - 5) + 5) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}
export default GetRandomNumber;