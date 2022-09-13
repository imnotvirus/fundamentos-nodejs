const express = require("express");
const { v4: uuidv4 } = require("uuid");
const app = express();

app.use(express.json());

const PORT = 3333;

const customers = [];
/*
 * ----------------------------------------------------------------
 *   cpf - string
 *   name - string
 *   id - uuid
 *   statement []
 */

//middleware

function verifyIfExistAccountCPF(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find((c) => c.cpf === cpf);

  if (!customer) {
    return res.status(400).json({ error: "Customer not found!" });
  }

  req.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
}

app.post("/account", (req, res) => {
  const { name, cpf } = req.body;

  const customersAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customersAlreadyExists) {
    return res.status(400).json({ error: "Customer already exists!" });
  }

  customers.push({
    cpf,
    id: uuidv4(),
    name,
    statement: [],
  });

  return res.status(201).send();
});
app.get("/statement/", verifyIfExistAccountCPF, (req, res) => {
  const { customer } = req;
  return res.json(customer.statement);
});
app.get("/statement/date", verifyIfExistAccountCPF, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormated = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.createdAt.toDateString() ===
      new Date(dateFormated).toISOString()
  );

  return res.json(statement);
});
app.post("/deposit/", verifyIfExistAccountCPF, (req, res) => {
  const { customer } = req;
  const { description, amount } = req.body;

  const statementOperation = {
    description,
    amount,
    createdAt: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  return res.status(201).json(statementOperation);
});
app.post("/withdraw/", verifyIfExistAccountCPF, (req, res) => {
  const { customer } = req;
  const { amount } = req.body;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return res.status(400).json({ error: "Amount out of range" });
  }

  const statementOperation = {
    amount,
    createdAt: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return res.status(201).json(statementOperation);
});

app.put("/account", verifyIfExistAccountCPF, (req, res) => {
  const { name } = req.body;

  const { customer } = req;
  customer.name = name;

  return res.status(201).send();
});

app.get("/account", verifyIfExistAccountCPF, (req, res) => {
  const { customer } = req;

  return res.json(customer);
});
app.get("/balance", verifyIfExistAccountCPF, (req, res) => {
  const { customer } = req;
  const balance = getBalance(customer.statement);
  return res.json({ balance });
});

app.delete("/account", verifyIfExistAccountCPF, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.status(200).json(customers);
});

app.listen(PORT);
