fn main() {
    let password = "admin123";
    let hash = bcrypt::hash(password, 10).expect("Failed to hash password");
    println!("{}", hash);
}
