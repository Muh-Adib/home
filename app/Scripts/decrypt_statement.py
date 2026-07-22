import sys
import os
import hashlib
import msoffice_decrypt
from Crypto.Cipher import AES
from struct import pack
from binascii import hexlify, unhexlify
import openpyxl
import json

# Monkey patch msoffice_decrypt hashCalc to support 'SHA1' and 'SHA-1'
orig_hashCalc = msoffice_decrypt.hashCalc

def patched_hashCalc(i, algorithm):
    alg_upper = str(algorithm).upper().replace('-', '')
    if alg_upper == 'SHA1':
        return hashlib.sha1(i)
    elif alg_upper == 'SHA256':
        return hashlib.sha256(i)
    elif alg_upper == 'SHA384':
        return hashlib.sha384(i)
    elif alg_upper == 'SHA512':
        return hashlib.sha512(i)
    elif alg_upper == 'MD5':
        return hashlib.md5(i)
    return orig_hashCalc(i, algorithm)

msoffice_decrypt.hashCalc = patched_hashCalc

def patched_get_agile_aes_cbc_encryption_key(self, password):
    h = msoffice_decrypt.hashCalc(self.encryption_info.password_salt + password.encode("UTF-16LE"),
                 self.encryption_info.password_hash_algorithm)

    for i in range(0, self.encryption_info.spin_value, 1):
        h = msoffice_decrypt.hashCalc(pack("<I", i) + h.digest(), self.encryption_info.password_hash_algorithm)

    h2 = msoffice_decrypt.hashCalc(h.digest() + b'\x14\x6e\x0b\xe7\xab\xac\xd0\xd6', self.encryption_info.password_hash_algorithm)
    a = hexlify(h2.digest())[:2*self.encryption_info.password_key_bits//8]
    skey3 = unhexlify(a)

    aes = AES.new(skey3, AES.MODE_CBC, self.encryption_info.password_salt)
    skey = aes.decrypt(self.encryption_info.encrypted_key_vaue)

    h2 = msoffice_decrypt.hashCalc(h.digest() + b'\xfe\xa7\xd2\x76\x3b\x4b\x9e\x79', self.encryption_info.password_hash_algorithm)
    a = hexlify(h2.digest())[:2*self.encryption_info.password_key_bits//8]
    skey3 = unhexlify(a)
    aes = AES.new(skey3, AES.MODE_CBC, self.encryption_info.password_salt)
    decrypted_verifier_hash_input = aes.decrypt(self.encryption_info.encrypted_verifier_hash_input)

    h2 = msoffice_decrypt.hashCalc(h.digest() + b'\xd7\xaa\x0f\x6d\x30\x61\x34\x4e', self.encryption_info.password_hash_algorithm)
    a = hexlify(h2.digest())[:2*self.encryption_info.password_key_bits//8]
    skey3 = unhexlify(a)
    aes = AES.new(skey3, AES.MODE_CBC, self.encryption_info.password_salt)
    decrypted_verifier_hash_value = aes.decrypt(self.encryption_info.encrypted_verifier_hash_value)

    computed_hash = msoffice_decrypt.hashCalc(decrypted_verifier_hash_input, self.encryption_info.key_data_hash_algorithm).digest()
    
    if decrypted_verifier_hash_value[:len(computed_hash)] != computed_hash:
        return None

    return skey

msoffice_decrypt.MSOfficeDecryptor.get_agile_aes_cbc_encryption_key = patched_get_agile_aes_cbc_encryption_key

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: decrypt_statement.py <file_path> <output_path> [password]"}))
        sys.exit(1)

    file_path = sys.argv[1]
    output_path = sys.argv[2]
    password = sys.argv[3] if len(sys.argv) > 3 else ""

    if not os.path.exists(file_path):
        print(json.dumps({"success": False, "error": f"File not found: {file_path}"}))
        sys.exit(1)

    try:
        with open(file_path, 'rb') as f_in:
            try:
                decryptor = msoffice_decrypt.MSOfficeDecryptor(f_in, output_path)
                if decryptor.is_encrypted:
                    if not password:
                        print(json.dumps({"success": False, "requires_password": True, "error": "File terenkripsi. Silakan masukkan kata sandi (password) file."}))
                        sys.exit(1)
                    
                    res = decryptor.decrypt(password)
                    if not res or not os.path.exists(output_path):
                        print(json.dumps({"success": False, "requires_password": True, "error": "Kata sandi (password) file salah atau tidak cocok."}))
                        sys.exit(1)
                else:
                    # File is not encrypted, copy directly to output_path
                    with open(output_path, 'wb') as f_out:
                        f_in.seek(0)
                        f_out.write(f_in.read())
            except Exception as ex:
                # Fallback if not an OLE/Encrypted document
                with open(output_path, 'wb') as f_out:
                    f_in.seek(0)
                    f_out.write(f_in.read())

        print(json.dumps({"success": True, "output_path": output_path}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
